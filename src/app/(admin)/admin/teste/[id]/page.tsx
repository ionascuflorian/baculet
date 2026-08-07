import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { QuizForm } from "@/components/admin/quiz-form";
import { QuestionForm } from "@/components/admin/question-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PendingLink } from "@/components/admin/pending-link";
import { deleteQuestion } from "@/lib/actions/admin";

export default async function AdminQuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      subject: true,
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!quiz) notFound();

  const subjects = await prisma.subject.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/admin/teste"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la teste
      </Link>

      <Card>
        <CardContent className="p-5">
          <h1 className="mb-4 text-2xl font-extrabold text-ink">{quiz.title}</h1>
          <QuizForm
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            subjectId={quiz.subjectId}
            quizId={quiz.id}
            initial={{
              title: quiz.title,
              slug: quiz.slug,
              description: quiz.description ?? "",
              difficulty: quiz.difficulty,
              published: quiz.published,
              order: quiz.order,
            }}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold text-ink">
          Întrebări ({quiz.questions.length})
        </h2>

        <div className="space-y-3">
          {quiz.questions.map((q, index) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">
                      {index + 1}. {q.text}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(q.options as string[]).map((opt, i) => (
                        <span
                          key={i}
                          className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                            i === q.correctIndex
                              ? "bg-accent/10 text-accent"
                              : "bg-feather text-subtle"
                          }`}
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DeleteButton action={deleteQuestion} id={q.id} />
                    <PendingLink
                      href={`/admin/intrebari/${q.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      Editează <ChevronRight className="h-3.5 w-3.5" />
                    </PendingLink>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <p className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
              <Plus className="h-5 w-5" /> Adaugă o întrebare
            </p>
            <QuestionForm
              quizId={quiz.id}
              questionId={null}
              initial={{
                text: "",
                options: [],
                correctIndex: 0,
                explanation: "",
                order: quiz.questions.length + 1,
              }}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
