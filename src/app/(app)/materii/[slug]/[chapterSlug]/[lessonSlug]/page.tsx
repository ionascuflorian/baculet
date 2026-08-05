import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Video, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarkLessonComplete } from "@/components/mark-lesson-complete";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string; lessonSlug: string }>;
}) {
  const { slug, chapterSlug, lessonSlug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const subject = await prisma.subject.findUnique({ where: { slug } });
  if (!subject) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: { subjectId_slug: { subjectId: subject.id, slug: chapterSlug } },
    include: {
      lessons: { orderBy: { order: "asc" } },
    },
  });
  if (!chapter) notFound();

  const lesson = chapter.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) notFound();

  const idx = chapter.lessons.findIndex((l) => l.id === lesson.id);
  const prev = chapter.lessons[idx - 1] ?? null;
  const next = chapter.lessons[idx + 1] ?? null;

  const progress = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { chapterId: chapter.id } },
    select: { lessonId: true },
  });
  const doneIds = new Set(progress.map((p) => p.lessonId));
  const isDone = doneIds.has(lesson.id);
  // Marcarea acestei lecții finalizează capitolul doar dacă restul sunt deja parcure.
  const completesChapter =
    !isDone &&
    chapter.lessons.every((l) => l.id === lesson.id || doneIds.has(l.id));

  const path = `/materii/${slug}/${chapterSlug}/${lessonSlug}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3">
          <Link href={`/materii/${slug}/${chapterSlug}`}>
            <ArrowLeft className="h-4 w-4" /> {chapter.title}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Badge>{subject.name}</Badge>
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

      <Card>
        <CardContent className="py-6">
          <Markdown content={lesson.content} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {prev && (
          <div className="flex justify-start">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/materii/${slug}/${chapterSlug}/${prev.slug}`}>
                <ArrowLeft className="h-4 w-4" /> {prev.title}
              </Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <MarkLessonComplete
              lessonId={lesson.id}
              path={path}
              isDone={isDone}
              completesChapter={completesChapter}
            />
          </div>

          {next ? (
            <Button asChild variant="secondary" size="lg" className="w-full min-w-0">
              <Link
                href={`/materii/${slug}/${chapterSlug}/${next.slug}`}
                className="flex items-center justify-center gap-2"
              >
                <span className="truncate">{next.title}</span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="lg" className="w-full">
              <Link href={`/materii/${slug}`}>Gata capitolul</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
