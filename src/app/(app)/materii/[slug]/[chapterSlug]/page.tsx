import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight, ArrowLeft, ListChecks } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}) {
  const { slug, chapterSlug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const subject = await prisma.subject.findUnique({ where: { slug } });
  if (!subject) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: { subjectId_slug: { subjectId: subject.id, slug: chapterSlug } },
    include: {
      subject: true,
      lessons: { orderBy: { order: "asc" } },
      quizzes: {
        where: { published: true, OR: [{ userId: null }, { userId }] },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!chapter) notFound();

  const completed = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { chapterId: chapter.id } },
    select: { lessonId: true },
  });
  const completedIds = new Set(completed.map((c) => c.lessonId));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3">
          <Link href={`/materii/${chapter.subject.slug}`}>
            <ArrowLeft className="h-4 w-4" /> {chapter.subject.name}
          </Link>
        </Button>
        <h1 className="text-3xl font-extrabold text-ink">{chapter.title}</h1>
        {chapter.description && (
          <p className="mt-1 text-subtle">{chapter.description}</p>
        )}
      </div>

      <div className="space-y-3">
        {chapter.lessons.map((lesson, idx) => {
          const isDone = completedIds.has(lesson.id);
          return (
            <Link
              key={lesson.id}
              href={`/materii/${chapter.subject.slug}/${chapter.slug}/${lesson.slug}`}
            >
              <Card
                className={cn(
                  "flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                  isDone && "border-brand/50"
                )}
              >
                <CardContent className="flex w-full items-center gap-4 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-feather/50 text-sm font-bold text-subtle">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{lesson.title}</p>
                    <p className="text-sm text-subtle">Lecție</p>
                  </div>
                  {isDone ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
                  ) : (
                    <Circle className="h-6 w-6 shrink-0 text-feather" />
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {chapter.quizzes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Teste pe acest capitol</h2>
          {chapter.quizzes.map((quiz) => (
            <Link key={quiz.id} href={`/teste/${quiz.slug}`}>
              <Card className="flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex w-full items-center gap-3 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <ListChecks className="h-5 w-5 text-accent" />
                  </div>
                  <span className="font-bold text-ink">{quiz.title}</span>
                  <ChevronRight className="ml-auto h-5 w-5 text-subtle" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
