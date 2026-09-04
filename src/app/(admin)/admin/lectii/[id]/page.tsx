import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LessonForm } from "@/components/admin/lesson-form";
import { LessonExercises } from "@/components/admin/lesson-exercises";
import { getOrCreateLessonQuiz } from "@/lib/lesson-quiz";

export default async function AdminLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { chapter: { include: { subject: true } }, steps: { orderBy: { order: "asc" } } },
  });

  if (!lesson) notFound();

  const path = `/admin/lectii/${id}`;
  const quiz = await getOrCreateLessonQuiz(id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/admin/capitole/${lesson.chapterId}`}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {lesson.chapter.subject.name} / {lesson.chapter.title}
      </Link>
      <Card>
        <CardContent className="p-5">
          <h1 className="mb-4 text-2xl font-extrabold text-ink">{lesson.title}</h1>
          <p className="mb-3 text-xs font-semibold text-subtle">{lesson.steps.length} pași generați din markdown (##) · progresul elevilor se păstrează per pas</p>
          <Button asChild variant="accent" size="sm" className="mb-4">
            <Link href={`/admin/lectii/${lesson.id}/constructor`}>
              <Layers className="h-4 w-4" /> Constructor Lecție (Hybrid)
            </Link>
          </Button>
          <div className="mb-5 rounded-xl border border-accent/20 bg-accent/5 p-4">
            <p className="text-xs font-extrabold uppercase tracking-widest text-accent">
              Cum construiești lecția pe etape
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs font-semibold text-subtle">
              <li>
                Deschide <b className="text-ink">Constructor Lecție (Hybrid)</b> și adaugă secțiuni în
                ordinea{" "}
                <b className="text-ink">Teorie → Exercițiu → Teorie → Exercițiu…</b>
              </li>
              <li>
                Secțiunile de teorie/exemplu au <b className="text-ink">timp minim de citire</b> —
                elevul nu poate trece mai departe înainte de timer.
              </li>
              <li>
                Exercițiile devin quiz cu feedback instant; poți genera întrebările cu AI.
              </li>
              <li>
                Dacă editezi markdown-ul lecției, secțiunile create în Constructor{" "}
                <b className="text-ink">nu se rescriu</b> — doar „pașii din markdown” se sincronizează.
              </li>
            </ol>
          </div>
          <LessonForm
            chapterId={lesson.chapterId}
            lessonId={lesson.id}
            mathSubject={lesson.chapter.subject.name.toLowerCase().includes("matem")}
            initial={{
              title: lesson.title,
              slug: lesson.slug,
              content: lesson.content,
              videoUrl: lesson.videoUrl ?? "",
              pdfUrl: lesson.pdfUrl ?? "",
              order: lesson.order,
              difficulty: lesson.difficulty,
            }}
          />
          {lesson.steps.length > 0 && (
            <div className="mt-4 rounded-xl border border-feather p-3">
              <p className="text-xs font-extrabold text-ink mb-2">Previzualizare pași:</p>
              <div className="space-y-1">
                {lesson.steps.map((s) => (
                  <p key={s.id} className="text-xs text-subtle">Pasul {s.order + 1}: {s.title ?? "(fără titlu)"} — {s.content.slice(0, 60)}...</p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          {quiz ? (
            <LessonExercises
              path={path}
              quizId={quiz.id}
              lessonTitle={lesson.title}
              subjectName={lesson.chapter.subject.name}
              lessonContent={lesson.content}
              questions={quiz.questions.map((q) => ({
                id: q.id,
                text: q.text,
                options: q.options as string[],
                correctIndex: q.correctIndex,
                explanation: q.explanation,
                type: q.type as string,
                concept: q.concept,
                order: q.order,
              }))}
            />
          ) : (
            <p className="text-sm font-semibold text-subtle">Nu s-a putut încărca modulul de exerciții.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
