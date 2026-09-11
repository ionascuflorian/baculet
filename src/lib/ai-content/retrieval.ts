import { embed } from "ai";
import { prisma } from "@/lib/db";
import { resolveStudioModel } from "./provider";

export interface ChunkHit {
  chunkId: string;
  sourceId: string;
  sourceName: string;
  page?: number;
  section?: string;
  text: string;
  score: number;
}

export interface SearchOptions {
  limit?: number;
  sourceIds?: string[];
  priorities?: string[];
}

// Căutare hibridă pe chunks-urile unui proiect:
// cosine similarity pe embeddings + keyword match + rank full-text Postgres.
export async function searchProjectChunks(
  projectId: string,
  query: string,
  opts: SearchOptions = {}
): Promise<ChunkHit[]> {
  const limit = Math.min(12, Math.max(1, opts.limit ?? 6));

  const candidates = await prisma.contentChunk.findMany({
    where: {
      projectId,
      ...(opts.sourceIds?.length
        ? { sourceId: { in: opts.sourceIds } }
        : opts.priorities?.length
          ? { source: { priority: { in: opts.priorities as never[] } } }
          : {}),
    },
    select: {
      id: true,
      sourceId: true,
      page: true,
      section: true,
      text: true,
      embedding: true,
      source: { select: { originalName: true, priority: true } },
    },
  });
  if (candidates.length === 0) return [];

  const queryLower = query.toLowerCase();
  const tokens = queryLower.split(/\s+/).filter((t) => t.length > 2);

  // 1) vector de căutare (semantic)
  let queryVector: number[] | null = null;
  let providersReady = true;
  try {
    const studio = await resolveStudioModel();
    const result = await embed({ model: studio.embedding, value: query.slice(0, 8000) });
    queryVector = Array.from(result.embedding);
  } catch {
    providersReady = false;
  }

  // 2) rank full-text Postgres (fallback / boost)
  let ftsRank: Map<string, number> = new Map();
  if (tokens.length > 0) {
    try {
      const rows = await prisma.$queryRaw<
        Array<{ id: string; rank: number }>
      >`SELECT id, ts_rank(to_tsvector('simple', text), plainto_tsquery('simple', ${query})) AS rank
         FROM "ContentChunk" WHERE "projectId" = ${projectId} AND to_tsvector('simple', text) @@ plainto_tsquery('simple', ${query})`;
      ftsRank = new Map(rows.map((r) => [r.id, r.rank]));
    } catch {
      // FTS indisponibil (ex. lipsă config) → ignorăm boost-ul, rămâne keyword.
    }
  }

  // 3) scoring hibrid
  const scored = candidates.map((c) => {
    const textLower = c.text.toLowerCase();
    const matchedTokens = tokens.filter((t) => textLower.includes(t)).length;
    const keywordScore = tokens.length ? matchedTokens / tokens.length : 0;

    let semantic = 0;
    if (queryVector && Array.isArray(c.embedding) && c.embedding.length > 0) {
      semantic = cosine(queryVector, c.embedding as number[]);
    }

    const rank = ftsRank.get(c.id) ?? 0;
    const ftsNorm = rank / (1 + rank);

    const score = semantic * 0.7 + keywordScore * 0.2 + ftsNorm * 0.1;
    return { c, score };
  });

  return scored
    .filter((s) => providersReady ? s.score > 0.05 : true)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({
      chunkId: s.c.id,
      sourceId: s.c.sourceId,
      sourceName: s.c.source.originalName,
      page: s.c.page ?? undefined,
      section: s.c.section ?? undefined,
      text: s.c.text,
      score: Number(s.score.toFixed(4)),
    }));
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Caută conținut LIVE (deja publicat) pentru duplicate detection în assistant.
export async function searchLiveContent(query: string, limit = 4) {
  const q = query.toLowerCase();
  const [lessons, units, chapters, quizzes] = await Promise.all([
    prisma.lesson.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, slug: true, chapter: { select: { title: true } } },
      take: limit,
    }),
    prisma.unit.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, slug: true, chapter: { select: { title: true } } },
      take: limit,
    }),
    prisma.chapter.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, slug: true, subject: { select: { name: true } } },
      take: limit,
    }),
    prisma.quiz.findMany({
      where: { title: { contains: q, mode: "insensitive" }, published: true },
      select: { id: true, title: true, slug: true, subject: { select: { name: true } } },
      take: limit,
    }),
  ]);
  return {
    lessons,
    units,
    chapters,
    quizzes,
    total:
      lessons.length + units.length + chapters.length + quizzes.length,
  };
}