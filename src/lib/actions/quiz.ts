"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextStreak } from "@/lib/streak";
import { recordStudyActivity } from "@/lib/study-activity";

export async function submitQuiz(
  quizId: string,
  answers: Record<string, number>
): Promise<{ attemptId: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      published: true,
      userId: true,
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, correctIndex: true },
      },
    },
  });
  if (!quiz) throw new Error("Testul nu există");
  if (!quiz.published) throw new Error("Testul nu este disponibil");
  if (quiz.userId && quiz.userId !== session.user.id)
    throw new Error("Neautorizat");
  if (quiz.questions.length === 0) throw new Error("Testul nu are întrebări");

  const score = quiz.questions.filter(
    (q) => answers[q.id] === q.correctIndex
  ).length;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      quizId: quiz.id,
      score,
      maxScore: quiz.questions.length,
      answers,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastActiveAt: true, streakCount: true },
  });
  if (user) {
    const streak = nextStreak(user.lastActiveAt, user.streakCount);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        lastActiveAt: streak.lastActiveAt,
        streakCount: streak.streakCount,
      },
    });
  }

  await recordStudyActivity(session.user.id);

  return { attemptId: attempt.id };
}
