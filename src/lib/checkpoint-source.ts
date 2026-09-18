import { prisma } from "@/lib/db";

// Sursa întrebărilor unui checkpoint: se agregă din lecțiile unității pe care
// checkpoint-ul o închide (checkbox pe lesson steps), apoi din quiz-urile
// capitolului (legacy), apoi din materie. Întrebările sunt deduplicate, iar
// ordinul e deterministic.

const ROW_SELECT = {
  id: true,
  text: true,
  options: true,
  correctIndex: true,
  answer: true,
  explanation: true,
  type: true,
  difficulty: true,
  conceptId: true,
  concept: true,
  conceptRef: { select: { id: true, name: true, slug: true } },
} as const;

export type CheckpointQuestionRow = {
  id: string;
  text: string;
  options: unknown;
  correctIndex: number;
  answer: unknown;
  explanation: string | null;
  type: string;
  difficulty: number | null;
  conceptId: string | null;
  concept: string | null;
  conceptRef: { id: string; name: string; slug: string } | null;
};

const MAX_QUESTIONS = 10;
const UNIT_BUDGET = 8;

export async function gatherCheckpointQuestions(
  checkpointSlug: string
): Promise<CheckpointQuestionRow[]> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { slug: checkpointSlug },
    select: { id: true, unitId: true, chapterId: true },
  });
  if (!checkpoint) return [];

  const seen = new Set<string>();
  const rows: CheckpointQuestionRow[] = [];

  const push = (batch: CheckpointQuestionRow[]) => {
    for (const row of batch) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  };

  // 1. Lecțiile unității pe care o încheie checkpoint-ul (sursa canonică).
  if (checkpoint.unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: checkpoint.unitId },
      select: { chapterId: true },
    });
    if (unit && (unit.chapterId === checkpoint.chapterId || !checkpoint.chapterId)) {
      const fromUnit = await prisma.question.findMany({
        where: { quiz: { step: { lesson: { unitId: checkpoint.unitId } } } },
        select: ROW_SELECT,
        orderBy: [{ quiz: { step: { lesson: { unit: { order: "asc" } } } } }, { order: "asc" }],
        take: UNIT_BUDGET,
      });
      push(fromUnit as unknown as CheckpointQuestionRow[]);
    }
  }

  const chapterId = checkpoint.chapterId ?? null;

  // 2. Quiz-urile capitolului (lecții legacy / exerciții de capitol).
  if (chapterId && rows.length < MAX_QUESTIONS) {
    const fromChapter = await prisma.question.findMany({
      where: {
        quiz: { chapterId, step: null },
      },
      select: ROW_SELECT,
      orderBy: { order: "asc" },
      take: MAX_QUESTIONS - rows.length,
    });
    push(fromChapter as unknown as CheckpointQuestionRow[]);
  }

  // 3. Materia (fallback: capitol fără unități sau conținut insuficient).
  if (rows.length < 5 && chapterId) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { subjectId: true },
    });
    if (chapter) {
      const fromSubject = await prisma.question.findMany({
        where: { quiz: { subjectId: chapter.subjectId, step: null } },
        select: ROW_SELECT,
        orderBy: { order: "asc" },
        take: Math.min(10 - rows.length, 5),
      });
      push(fromSubject as unknown as CheckpointQuestionRow[]);
    }
  }

  return rows.slice(0, MAX_QUESTIONS);
}

/** Normalizează un rând DB în orașul de date folosit de suprafața checkpoint-ului. */
export interface CheckpointQuestionDto {
  id: string;
  text: string;
  options: unknown;
  correctIndex: number;
  answer?: unknown;
  explanation?: string | null;
  type: string;
  difficulty?: number;
  conceptId?: string | null;
  conceptSlug?: string | null;
  conceptName?: string | null;
}

export function toCheckpointQuestionDto(row: CheckpointQuestionRow): CheckpointQuestionDto {
  return {
    id: row.id,
    text: row.text,
    options: row.options,
    correctIndex: row.correctIndex,
    answer: row.answer ?? undefined,
    explanation: row.explanation,
    type: row.type,
    difficulty: row.difficulty ?? 1,
    conceptId: row.conceptId ?? row.conceptRef?.id ?? null,
    conceptSlug: row.conceptRef?.slug ?? row.concept ?? null,
    conceptName: row.conceptRef?.name ?? row.concept ?? null,
  };
}