import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { ExamForm } from "@/components/admin/exam-form";

export default async function NewExamPage() {
  const subjects = await prisma.subject.findMany({ orderBy: { order: "asc" } });
  const defaultSubject = subjects[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/subiecte"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la subiecte
      </Link>
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Subiect BAC nou</h1>
        <p className="mt-1 text-subtle">Adaugă un subiect oficial de examen.</p>
      </section>
      <ExamForm
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        subjectId={defaultSubject?.id ?? ""}
        examId={null}
        initial={{
          year: new Date().getFullYear(),
          session: "SUMMER",
          profile: "REAL",
          title: "",
          pdfUrl: "",
          solutionUrl: "",
          order: 1,
        }}
      />
    </div>
  );
}
