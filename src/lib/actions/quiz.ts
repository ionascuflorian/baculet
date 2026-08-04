"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextStreak } from "@/lib/streak";

export async function submitQuiz(
  quizId: string,
  answers: Record<string, number>
): Promise<{ attemptId: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) throw new Error("Testul nu există");

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

  return { attemptId: attempt.id };
}
