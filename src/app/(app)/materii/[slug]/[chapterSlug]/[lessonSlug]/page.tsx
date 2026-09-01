import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Video, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarkLessonComplete } from "@/components/mark-lesson-complete";
import { LessonSteps } from "@/components/lesson/lesson-steps";
import { Markdown } from "@/components/markdown";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string; lessonSlug: string }>;
}) {
  const { slug, chapterSlug, lessonSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const chapter = await prisma.chapter.findFirst({
    where: { slug: chapterSlug, subject: { slug } },
    select: {
      id: true,
      title: true,
      subject: { select: { name: true } },
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true },
      },
    },
  });
  if (!chapter) notFound();

  const lesson = await prisma.lesson.findUnique({
    where: { chapterId_slug: { chapterId: chapter.id, slug: lessonSlug } },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      videoUrl: true,
      pdfUrl: true,
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          content: true,
          order: true,
          quiz: {
            select: {
              id: true,
              title: true,
              questions: { orderBy: { order: "asc" }, select: { id: true, text: true, options: true, correctIndex: true, explanation: true, type: true } },
            },
          },
        },
      },
    },
  });
  if (!lesson) notFound();

  const idx = chapter.lessons.findIndex((l) => l.id === lesson.id);
  const prev = chapter.lessons[idx - 1] ?? null;
  const next = chapter.lessons[idx + 1] ?? null;

  const [progress, stepProgress] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { chapterId: chapter.id } },
      select: { lessonId: true },
    }),
    prisma.lessonStepProgress.findMany({
      where: { userId, lessonId: lesson.id },
      select: { stepId: true },
    }),
  ]);
  const doneIds = new Set(progress.map((p) => p.lessonId));
  const isDone = doneIds.has(lesson.id);
  const doneStepIds = new Set(stepProgress.map((s) => s.stepId));
  const completesChapter =
    !isDone &&
    chapter.lessons.every((l) => l.id === lesson.id || doneIds.has(l.id));

  const path = `/materii/${slug}/${chapterSlug}/${lessonSlug}`;
  const hasSteps = lesson.steps.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3">
          <Link href={`/materii/${slug}/${chapterSlug}`}>
            <ArrowLeft className="h-4 w-4" /> {chapter.title}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Badge>{chapter.subject.name}</Badge>
          {isDone && <Badge>Parcursă</Badge>}
        </div>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">{lesson.title}</h1>
      </div>

      {(lesson.videoUrl || lesson.pdfUrl) && (
        <div className="flex flex-wrap gap-3">
          {lesson.videoUrl && (
            <Button asChild variant="accent" size="sm">
              <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">
                <Video className="h-4 w-4" /> Vezi video
              </a>
            </Button>
          )}
          {lesson.pdfUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={lesson.pdfUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" /> PDF
              </a>
            </Button>
          )}
        </div>
      )}

      {hasSteps ? (
        <LessonSteps
          lessonId={lesson.id}
          lessonSlugPath={path}
          steps={lesson.steps.map((s) => ({
            id: s.id,
            title: s.title,
            content: s.content,
            order: s.order,
            quiz: s.quiz
              ? {
                  id: s.quiz.id,
                  title: s.quiz.title,
                  questions: s.quiz.questions.map((q) => ({
                    id: q.id,
                    text: q.text,
                    options: q.options as string[],
                    correctIndex: q.correctIndex,
                    explanation: q.explanation,
                    type: q.type as string,
                  })),
                }
              : null,
          }))}
          doneStepIds={doneStepIds}
          isLessonDone={isDone}
        />
      ) : (
        <>
          <Card>
            <CardContent className="py-6">
              <Markdown content={lesson.content} />
            </CardContent>
          </Card>
          <div className="space-y-3">
            <MarkLessonComplete lessonId={lesson.id} path={path} isDone={isDone} completesChapter={completesChapter} />
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-2">
        {prev ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/materii/${slug}/${chapterSlug}/${prev.slug}`}>
              <ArrowLeft className="h-4 w-4" /> {prev.title}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/materii/${slug}/${chapterSlug}/${next.slug}`} className="flex items-center gap-2">
              <span className="truncate">{next.title}</span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/materii/${slug}`}>Gata capitolul</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
