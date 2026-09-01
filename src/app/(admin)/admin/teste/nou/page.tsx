import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { QuizForm } from "@/components/admin/quiz-form";

export default async function NewQuizPage() {
  const subjects = await prisma.subject.findMany({ orderBy: { order: "asc" } });
  const defaultSubject = subjects[0];
  const chapters = defaultSubject ? await prisma.chapter.findMany({ where: { subjectId: defaultSubject.id }, orderBy: { order: "asc" }, select: { id: true, title: true } }) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/teste"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la teste
      </Link>
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Test nou</h1>
        <p className="mt-1 text-subtle">Creează testul, apoi adaugă întrebările.</p>
      </section>
      <QuizForm
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        subjectId={defaultSubject?.id ?? ""}
        quizId={null}
        chapters={chapters}
        initialChapterId={null}
        initial={{
          title: "",
          slug: "",
          description: "",
          difficulty: 1,
          published: true,
          order: 1,
        }}
      />
    </div>
  );
}
