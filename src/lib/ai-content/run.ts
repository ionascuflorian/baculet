import { embed } from "ai";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { resolveStudioModel } from "./provider";
import { extractText } from "./extract";
import { chunkParagraphs } from "./chunk";
import { fetchSourceFile } from "./storage";

// ── Embeddings (cu concurență limitată) ──────────────────────────────────────
export async function embedTexts(
  texts: string[],
  concurrency = 4
): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  const studio = await resolveStudioModel();
  const results: (number[] | null)[] = new Array(texts.length).fill(null);
  let cursor = 0;

  async function worker() {
    while (cursor < texts.length) {
      const idx = cursor++;
      const text = texts[idx].slice(0, 6000);
      try {
        const r = await embed({ model: studio.embedding, value: text });
        results[idx] = Array.from(r.embedding);
      } catch {
        results[idx] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, texts.length) }, worker));
  return results;
}

// ── Procesarea unei surse: extragere + chunking + embeddings ─────────────────
export async function processSource(
  sourceId: string,
  userId: string
): Promise<{ ok: boolean; chunks: number; error?: string }> {
  const source = await prisma.contentSource.findUnique({
    where: { id: sourceId },
    include: { project: { select: { id: true, name: true, subjectId: true } } },
  });
  if (!source) throw new Error("Sursă inexistentă");

  await prisma.contentSource.update({ where: { id: sourceId }, data: { status: "PROCESSING" } });
  const job = await prisma.generationJob.create({
    data: {
      projectId: source.projectId,
      userId,
      kind: "SOURCE_PROCESS",
      status: "RUNNING",
      startedAt: new Date(),
      params: { sourceId },
    },
  });

  try {
    const file = await fetchSourceFile(source.storageKey);
    const extracted = await extractText(file.data, source.mime);
    const chunks = chunkParagraphs(extracted.paragraphs).map((c) => ({
      ...c,
      text: c.text.slice(0, 8000),
    }));
    const embeddings = await embedTexts(
      chunks.map((c) => c.text),
      4
    );

    await prisma.$transaction(
      async (tx) => {
        await tx.contentChunk.deleteMany({ where: { sourceId } });
        // Inserăm în batch-uri de createMany (o interogare SQL per batch) în loc
        // de un create pe rând — un fișier mare cu sute/mii de chunk-uri depășea
        // timeout-ul de 5s al tranzacției pe poolerul Neon.
        const BATCH_SIZE = 500;
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          await tx.contentChunk.createMany({
            data: chunks.slice(i, i + BATCH_SIZE).map((c, j) => {
              const idx = i + j;
              return {
                sourceId,
                projectId: source.projectId,
                page: c.page ?? null,
                section: c.section ?? null,
                text: c.text,
                tokenCount: c.tokenCount,
                embedding: embeddings[idx] ?? Prisma.JsonNull,
              };
            }),
          });
        }
        await tx.contentSource.update({
          where: { id: sourceId },
          data: {
            status: "READY",
            pageCount: extracted.pageCount,
            charCount: extracted.charCount,
            error: null,
          },
        });
      },
      { timeout: 60_000 }
    );

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "DONE", finishedAt: new Date(), result: { chunks: chunks.length } },
    });
    return { ok: true, chunks: chunks.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Eroare la procesarea sursei";
    await prisma.$transaction([
      prisma.contentSource.update({ where: { id: sourceId }, data: { status: "FAILED", error: message } }),
      prisma.generationJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: message, finishedAt: new Date() },
      }),
    ]);
    return { ok: false, chunks: 0, error: message };
  }
}

// ── Contor pentru status de proiect ──────────────────────────────────────────
export async function refreshProjectStatus(projectId: string): Promise<void> {
  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      sources: { select: { status: true } },
      nodes: { select: { id: true } },
      items: { select: { status: true } },
    },
  });
  if (!project) return;

  if (project.status === "DRAFT") return;
  if (project.status === "ANALYZING") {
    const anyProcessing = project.sources.some((s) => s.status === "PROCESSING");
    const anyReady = project.sources.some((s) => s.status === "READY");
    if (!anyProcessing) {
      const next = anyReady ? "READY_FOR_REVIEW" : "FAILED";
      await prisma.contentProject.update({ where: { id: projectId }, data: { status: next } });
    }
  }
}