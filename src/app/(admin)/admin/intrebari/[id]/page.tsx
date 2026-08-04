import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionForm } from "@/components/admin/question-form";

export default async function AdminQuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: { quiz: { include: { subject: true } } },
  });

  if (!question) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/admin/teste/${question.quizId}`}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {question.quiz.subject.name} / {question.quiz.title}
      </Link>
      <Card>
        <CardContent className="p-5">
          <h1 className="mb-4 text-2xl font-extrabold text-ink">Editează întrebarea</h1>
          <QuestionForm
            quizId={question.quizId}
            questionId={question.id}
            initial={{
              text: question.text,
              options: (question.options as string[]).map((o) => String(o)),
              correctIndex: question.correctIndex,
              explanation: question.explanation ?? "",
              order: question.order,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
