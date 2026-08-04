import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ExamForm } from "@/components/admin/exam-form";

export default async function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exam = await prisma.officialExam.findUnique({
    where: { id },
    include: { subject: true },
  });

  if (!exam) notFound();

  const subjects = await prisma.subject.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/subiecte"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la subiecte
      </Link>
      <Card>
        <CardContent className="p-5">
          <h1 className="mb-4 text-2xl font-extrabold text-ink">{exam.title}</h1>
          <ExamForm
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
            subjectId={exam.subjectId}
            examId={exam.id}
            initial={{
              year: exam.year,
              session: exam.session,
              profile: exam.profile,
              title: exam.title,
              pdfUrl: exam.pdfUrl,
              solutionUrl: exam.solutionUrl ?? "",
              order: exam.order,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
