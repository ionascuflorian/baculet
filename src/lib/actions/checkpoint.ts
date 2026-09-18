"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { updateConceptMastery } from "@/lib/mastery";
import { revalidateLearning } from "@/lib/revalidate";
import { gatherCheckpointQuestions } from "@/lib/checkpoint-source";
import { checkAnswer, normalizeQuestion, parseUserAnswer } from "@/lib/lesson/exercise-schema";
import { getCheckpointNextAction, type NextAction } from "@/lib/next-action";

/** Pragul de trecere al checkpoint-ului (0–100). */
const CHECKPOINT_PASS_PCT = 70;

export interface CheckpointResult {
  attemptId: string;
  score: number;
  maxScore: number;
  pct: number;
  weakConcepts: { conceptId: string; name: string }[];
  masteredConcepts: { conceptId: string; name: string }[];
  masteryUpdates: { conceptId: string; mastery: number }[];
  nextAction: NextAction;
}

const PASS_PCT = CHECKPOINT_PASS_PCT;

export async function submitCheckpoint(
  checkpointSlug: string,
  answers: Record<string, unknown>
): Promise<CheckpointResult> {
  const user = await requireUser();
  const userId = user.id;

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { slug: checkpointSlug },
    select: { id: true, slug: true, unitId: true, chapterId: true },
  });
  if (!checkpoint) throw new Error("Checkpoint inexistent");

  const rows = await gatherCheckpointQuestions(checkpointSlug);
  if (rows.length === 0) throw new Error("Nu există exerciții pentru acest checkpoint");

  // Scorare autoritativă pe server, folosind același motor ca lecțiile
  // interactive (normalizeQuestion + parseUserAnswer + checkAnswer).
  const scored = rows.map((row) => {
    const exercise = normalizeQuestion(row as Parameters<typeof normalizeQuestion>[0]);
    return {
      row,
      exercise,
      parsed: parseUserAnswer(exercise.kind, answers[row.id]),
    };
  });

  const byConcept = new Map<string, { id: string | null; slug: string | null; name: string; correct: number; total: number }>();
  let score = 0;

  for (const s of scored) {
    const correct = checkAnswer(s.exercise, s.parsed);
    if (correct) score += 1;

    const conceptId = s.row.conceptId ?? s.row.conceptRef?.id ?? null;
    const slug = s.row.conceptRef?.slug ?? s.row.concept ?? null;
    const name = s.row.conceptRef?.name ?? s.row.concept ?? "Concept";
    const key = conceptId ?? slug ?? "general";
    const cur = byConcept.get(key) ?? { id: conceptId, slug, name, correct: 0, total: 0 };
    cur.total += 1;
    if (correct) cur.correct += 1;
    if (!cur.id && conceptId) cur.id = conceptId;
    byConcept.set(key, cur);
  }

  const maxScore = scored.length;
  const pct = Math.round((score / maxScore) * 100);

  const weakConcepts: { conceptId: string; name: string }[] = [];
  const masteredConcepts: { conceptId: string; name: string }[] = [];
  for (const [, data] of byConcept.entries()) {
    const isWeak = data.correct < data.total;
    const idResolved = data.id ?? data.slug ?? "general";
    (isWeak ? weakConcepts : masteredConcepts).push({ conceptId: idResolved, name: data.name });
  }

  const masteryUpdates: { conceptId: string; mastery: number }[] = [];

  // Tranzacție: attempt + mastery + progres unitate merg împreună.
  const attempt = await prisma.$transaction(async (tx) => {
    const att = await tx.checkpointAttempt.create({
      data: {
        userId,
        checkpointId: checkpoint.id,
        score,
        maxScore,
        answers: answers as object,
      },
    });

    for (const [, data] of byConcept.entries()) {
      if (!data.id) continue; // fără concept rezolvat — nu actualizăm mastery
      const allCorrectForConcept = data.correct === data.total;
      const prog = await updateConceptMastery(userId, data.id, allCorrectForConcept, 2, { isCheckpoint: true }, tx);
      masteryUpdates.push({ conceptId: data.id, mastery: prog.mastery });
    }

    if (checkpoint.unitId) {
      const status = pct >= PASS_PCT ? "COMPLETED" : "NEEDS_REVIEW";
      await tx.userUnitProgress.upsert({
        where: { userId_unitId: { userId, unitId: checkpoint.unitId } },
        update: { progress: 100, status, score: pct, completedAt: new Date() },
        create: { userId, unitId: checkpoint.unitId, progress: 100, status, score: pct, completedAt: new Date() },
      });
    }

    return att;
  });

  const nextAction = await getCheckpointNextAction(userId, checkpoint, pct, weakConcepts);

  revalidateLearning(`/checkpoint/${checkpointSlug}`);

  return {
    attemptId: attempt.id,
    score,
    maxScore,
    pct,
    weakConcepts,
    masteredConcepts,
    masteryUpdates,
    nextAction,
  };
}

// Menținut pentru compatibilitate cu apeluri care importă tipul statutului.
export type { NextAction };