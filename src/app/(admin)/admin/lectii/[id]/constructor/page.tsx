import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { SectionConstructor } from "@/components/admin/section-constructor";
import { Button } from "@/components/ui/button";

export default async function AdminLessonConstructorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      chapter: {
        select: {
          id: true,
          slug: true,
          title: true,
          subject: { select: { id: true, name: true, slug: true } },
        },
      },
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          content: true,
          order: true,
          stepType: true,
          minReadTime: true,
          manual: true,
          quiz: { select: { id: true, title: true, _count: { select: { questions: true } } } },
        },
      },
    },
  });
  if (!lesson) notFound();

  const quizzes = await prisma.quiz.findMany({
    where: { subjectId: lesson.chapter.subject.id },
    select: {
      id: true,
      title: true,
      difficulty: true,
      _count: { select: { questions: true } },
      step: { select: { id: true, lessonId: true } },
    },
    orderBy: { title: "asc" },
  });

  const usedByOther = new Map<string, string>();
  for (const q of quizzes) {
    if (q.step && q.step.lessonId !== lesson.id) {
      usedByOther.set(q.id, q.step.lessonId);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/admin/lectii/${lesson.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {lesson.chapter.subject.name} / {lesson.title}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Constructor Lecție (Hybrid)</h1>
        <p className="mt-1 text-sm font-semibold text-subtle">
          Construiește lecția ca pe un feed: Teorie → Exercițiu → Exemple. Secțiunile adăugate aici
          nu sunt suprascrise de markdown.
        </p>

        <div className="mt-4 rounded-2xl border border-feather bg-feather/30 p-4">
          <p className="text-xs font-extrabold uppercase tracking-widest text-subtle">
            Cum construiești lecția pe etape
          </p>
          <ul className="mt-2 space-y-1 text-sm font-semibold text-ink">
            <li>
              1. Adaugă o secțiune <span className="text-sky-600">Teorie</span> cu conținut scurt (sub 500
              caractere) și timp minim de citire.
            </li>
            <li>
              2. Adaugă un <span className="text-orange-500">Exercițiu</span> — alege unul existent, creează
              întrebări manual sau generează cu AI.
            </li>
            <li>
              3. Repetă tiparul <b>Teorie → Exercițiu</b>; folosește{" "}
              <span className="text-emerald-600">Exemple</span> pentru demonstrații rezolvate.
            </li>
            <li>
              4. Trage cardurile pentru a reordona pașii. Elevii parcurg lecția secvențial, în această
              ordine.
            </li>
          </ul>
        </div>
      </div>

      <SectionConstructor
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        subjectName={lesson.chapter.subject.name}
        lessonContent={lesson.content}
        sections={lesson.steps.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          order: s.order,
          stepType: s.stepType,
          minReadTime: s.minReadTime,
          manual: s.manual,
          quiz: s.quiz
            ? { id: s.quiz.id, title: s.quiz.title, questionCount: s.quiz._count.questions }
            : null,
        }))}
        quizzes={quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          difficulty: q.difficulty,
          questionCount: q._count.questions,
          usedByOther: usedByOther.has(q.id),
          inThisLesson: Boolean(q.step && q.step.lessonId === lesson.id),
        }))}
      />

      <div className="flex items-center justify-between pb-4">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/lectii/${lesson.id}`}>
            <ArrowLeft className="h-4 w-4" /> Înapoi la lecție
          </Link>
        </Button>
        <span className="text-xs font-semibold text-subtle">
          Elevii văd lecția în ordinea acestor secțiuni.
        </span>
      </div>
    </div>
  );
}