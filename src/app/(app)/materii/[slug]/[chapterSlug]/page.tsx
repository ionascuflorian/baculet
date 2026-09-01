import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, ChevronRight, ArrowLeft, ListChecks, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}) {
  const { slug, chapterSlug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const chapter = await prisma.chapter.findFirst({
    where: { slug: chapterSlug, subject: { slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      subject: { select: { slug: true, name: true } },
      lessons: {
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true },
      },
      quizzes: {
        where: { published: true, OR: [{ userId: null }, { userId }] },
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true },
      },
    },
  });

  if (!chapter) notFound();

  const lessonIds = chapter.lessons.map((l) => l.id);
  const [completed, stepStats] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { chapterId: chapter.id } },
      select: { lessonId: true },
    }),
    prisma.lessonStepProgress.findMany({
      where: { userId, lessonId: { in: lessonIds } },
      select: { lessonId: true, stepId: true },
    }),
  ]);
  const completedIds = new Set(completed.map((c) => c.lessonId));
  // map lessonId -> step count done
  const stepsByLesson = new Map<string, number>();
  for (const s of stepStats) stepsByLesson.set(s.lessonId, (stepsByLesson.get(s.lessonId) ?? 0) + 1);
  const lessonsWithMeta = await prisma.lesson.findMany({
    where: { chapterId: chapter.id },
    orderBy: { order: "asc" },
    select: { id: true, _count: { select: { steps: true } } },
  });
  const stepsCountMap = new Map(lessonsWithMeta.map((l) => [l.id, l._count.steps]));

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
          const prevDone = idx === 0 || completedIds.has(chapter.lessons[idx - 1].id);
          const locked = !prevDone && !isDone;
          const totalSteps = stepsCountMap.get(lesson.id) ?? 0;
          const doneSteps = stepsByLesson.get(lesson.id) ?? 0;
          const pct = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : isDone ? 100 : 0;
          const card = (
            <Card
              className={cn(
                "flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
                isDone && "border-success/40",
                locked && "opacity-60"
              )}
            >
              <CardContent className="flex w-full items-center gap-4 p-4">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", locked ? "bg-feather/50 text-subtle" : isDone ? "bg-success/10 text-success" : "bg-accent/10 text-accent")}>
                  {locked ? <Lock className="h-4 w-4" /> : idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink flex items-center gap-2">{lesson.title} {locked && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-extrabold text-warning">BLOCAT</span>}</p>
                  <p className="text-sm text-subtle">{totalSteps ? `${doneSteps}/${totalSteps} pași` : "Lecție"} · {pct}%</p>
                  {totalSteps > 0 && <div className="mt-1 w-32"><Progress value={pct} /></div>}
                </div>
                {isDone ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
                ) : locked ? (
                  <Lock className="h-5 w-5 shrink-0 text-subtle" />
                ) : (
                  <Circle className="h-6 w-6 shrink-0 text-feather" />
                )}
              </CardContent>
            </Card>
          );
          return locked ? (
            <div key={lesson.id} title="Finalizează lecția anterioară pentru a debloca">{card}</div>
          ) : (
            <Link key={lesson.id} href={`/materii/${chapter.subject.slug}/${chapter.slug}/${lesson.slug}`}>
              {card}
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
