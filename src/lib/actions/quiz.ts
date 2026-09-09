"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { nextStreak } from "@/lib/streak";
import { recordStudyActivity } from "@/lib/study-activity";
import { recordReview } from "@/lib/spaced-repetition";
import { updateConceptMastery } from "@/lib/mastery";

export async function submitQuiz(
  quizId: string,
  answers: Record<string, number>
): Promise<{ attemptId: string }> {
  const user = await requireUser();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      published: true,
      userId: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, correctIndex: true, conceptId: true, concept: true },
      },
    },
  });
  if (!quiz) throw new Error("Testul nu există");
  if (!quiz.published) throw new Error("Testul nu este disponibil");
  if (quiz.userId && quiz.userId !== user.id)
    throw new Error("Neautorizat");
  if (quiz.questions.length === 0) throw new Error("Testul nu are întrebări");

  const score = quiz.questions.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: quiz.id,
      score,
      maxScore: quiz.questions.length,
      answers,
    },
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lastActiveAt: true, streakCount: true },
  });
  if (dbUser) {
    const streak = nextStreak(dbUser.lastActiveAt, dbUser.streakCount);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActiveAt: streak.lastActiveAt,
        streakCount: streak.streakCount,
      },
    });
  }

  await recordStudyActivity(user.id);

  // spaced repetition + mastery: înregistrează fiecare răspuns
  for (const q of quiz.questions) {
    const correct = answers[q.id] === q.correctIndex;
    try {
      await recordReview(user.id, q.id, correct);
    } catch (err) {
      console.error("submitQuiz: recordReview failed:", err);
    }
    // mastery pe concept (dacă întrebarea are concept legat)
    const conceptId = (q as unknown as { conceptId: string | null }).conceptId;
    if (conceptId) {
      try {
        await updateConceptMastery(user.id, conceptId, correct, 1, { isCheckpoint: false });
      } catch (err) {
        console.error("submitQuiz: mastery update failed:", err);
      }
    } else if (q.concept) {
      // fallback: găsește concept după slug dacă nu are FK
      try {
        const c = await prisma.concept.findFirst({ where: { slug: q.concept } });
        if (c) await updateConceptMastery(user.id, c.id, correct, 1);
      } catch (err) {
        console.error("submitQuiz: concept fallback failed:", err);
      }
    }
  }

  return { attemptId: attempt.id };
}
