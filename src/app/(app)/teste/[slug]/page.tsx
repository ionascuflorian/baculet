import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, History } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuizClient } from "@/components/quiz-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const quiz = await prisma.quiz.findFirst({
    where: {
      slug,
      OR: [{ userId: null }, { userId }],
    },
    include: {
      subject: true,
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!quiz) notFound();

  const recentAttempts = await prisma.quizAttempt.findMany({
    where: { userId, quizId: quiz.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const best = recentAttempts.length
    ? recentAttempts.reduce((b, cur) =>
        cur.score / cur.maxScore > b.score / b.maxScore ? cur : b
      )
    : null;

  const questions = quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options as string[],
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={`/materii/${quiz.subject.slug}`}>
            <ArrowLeft className="h-4 w-4" /> {quiz.subject.name}
          </Link>
        </Button>
        {best && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent">
            <Trophy className="h-4 w-4" />
            Cel mai bun: {Math.round((best.score / best.maxScore) * 100)}%
          </div>
        )}
      </div>

      {recentAttempts.length > 0 && (
        <Card>
          <CardContent className="flex items-center gap-2 text-sm text-subtle">
            <History className="h-4 w-4" />
            Ai mai rezolvat acest test de {recentAttempts.length}{" "}
            {recentAttempts.length === 1 ? "dată" : "ori"}.
          </CardContent>
        </Card>
      )}

      <QuizClient
        quizId={quiz.id}
        quizSlug={quiz.slug}
        title={quiz.title}
        questions={questions}
      />
    </div>
  );
}
