import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Confetti } from "@/components/confetti";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default async function QuizResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { slug } = await params;
  const { attempt: attemptId } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  if (!attemptId) redirect(`/teste/${slug}`);

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { orderBy: { order: "asc" } }, subject: true } },
    },
  });

  if (!attempt || attempt.userId !== userId) notFound();

  const answers = attempt.answers as Record<string, number>;
  const results = attempt.quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options as string[],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    userAnswer: answers[q.id],
    correct: answers[q.id] === q.correctIndex,
  }));

  const pct = Math.round((attempt.score / attempt.maxScore) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={`/materii/${attempt.quiz.subject.slug}`}>
          <ArrowLeft className="h-4 w-4" /> {attempt.quiz.subject.name}
        </Link>
      </Button>

      <Card className="animate-pop-in relative text-center">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          {pct >= 50 && <Confetti />}
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-2xl",
              pct >= 50 ? "bg-success/10" : "bg-danger/10"
            )}
          >
            <Trophy
              className={cn(
                "h-10 w-10",
                pct >= 50 ? "text-success" : "text-danger"
              )}
            />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">
            Scorul tău: {attempt.score}/{attempt.maxScore}
          </h1>
          <p className="text-subtle">
            {pct >= 80
              ? "Excelent! Ești pregătit. 🔥"
              : pct >= 50
                ? "Bine! Mai exersează puțin."
                : "Hai, mai încearcă o dată. Vei reuși!"}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/teste/${slug}`}>
              <RotateCcw className="h-4 w-4" /> Rezolvă din nou
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-ink">Detalii</h2>
        {results.map((r, idx) => (
          <Card
            key={r.id}
            className={cn(r.correct ? "border-success/50" : "border-danger/40")}
          >
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start gap-3">
                {r.correct ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                )}
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {idx + 1}. {r.text}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {r.options.map((opt, i) => {
                      const isCorrect = i === r.correctIndex;
                      const isUser = i === r.userAnswer;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm",
                            isCorrect
                              ? "border-success bg-success/10 font-bold text-ink"
                              : isUser
                                ? "border-danger bg-danger/10 text-ink"
                                : "border-feather text-subtle"
                          )}
                        >
                          <span className="font-extrabold">{LETTERS[i]}</span>
                          {opt}
                          {isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                          {isUser && !isCorrect && (
                            <XCircle className="ml-auto h-4 w-4 text-danger" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {r.explanation && (
                    <p className="mt-2 rounded-xl bg-accent/10 px-3 py-2 text-sm text-ink">
                      💡 {r.explanation}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
