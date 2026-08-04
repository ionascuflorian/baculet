import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ListChecks, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PROFILE_LABELS: Record<string, string> = {
  REAL: "Real",
  HUMAN: "Uman",
  TECH: "Tehnologic",
};

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const subject = await prisma.subject.findUnique({
    where: { slug },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      quizzes: {
        where: {
          published: true,
          chapterId: null,
          OR: [{ userId: null }, { userId }],
        },
        orderBy: { order: "asc" },
      },
      subjectProfiles: true,
    },
  });

  if (!subject) notFound();

  const completed = await prisma.lessonProgress.findMany({
    where: { userId, lesson: { chapter: { subjectId: subject.id } } },
    select: { lessonId: true },
  });
  const completedIds = new Set(completed.map((c) => c.lessonId));

  const chaptersWithProgress = subject.chapters.map((chapter) => {
    const done = chapter.lessons.filter((l) => completedIds.has(l.id)).length;
    return { ...chapter, done, pct: chapter.lessons.length ? Math.round((done / chapter.lessons.length) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3">
          <Link href="/materii">
            <ArrowLeft className="h-4 w-4" /> Toate materiile
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{subject.icon}</span>
          <div>
            <h1 className="text-3xl font-extrabold text-ink">{subject.name}</h1>
            {subject.description && (
              <p className="mt-1 text-subtle">{subject.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {subject.subjectProfiles.map((sp) => (
                <Badge key={sp.profile} variant="neutral">
                  {PROFILE_LABELS[sp.profile]}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-ink">Capitole</h2>
        {chaptersWithProgress.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-subtle">
              Capitolele pentru această materie se pregătesc.
            </CardContent>
          </Card>
        )}
        {chaptersWithProgress.map((chapter, idx) => (
          <Link key={chapter.id} href={`/materii/${subject.slug}/${chapter.slug}`}>
            <Card
              className={cn(
                "transition-all hover:-translate-y-0.5 hover:shadow-md",
                chapter.pct === 100 && "border-success/50"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 font-extrabold text-accent">
                    {idx + 1}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{chapter.title}</CardTitle>
                    <p className="text-sm text-subtle">
                      {chapter.lessons.length} lecții · {chapter.done} parcurse
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-subtle" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {subject.quizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-ink">Teste</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {subject.quizzes.map((quiz) => (
              <Link key={quiz.id} href={`/teste/${quiz.slug}`}>
                <Card className="flex h-full items-center gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                    <ListChecks className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{quiz.title}</p>
                    <p className="text-sm text-subtle">
                      Dificultate:{" "}
                      {"●".repeat(quiz.difficulty)}
                      {"○".repeat(Math.max(0, 3 - quiz.difficulty))}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
