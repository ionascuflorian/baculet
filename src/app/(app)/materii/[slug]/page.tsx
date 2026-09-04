import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ListChecks } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLearningPathForChapter } from "@/lib/learning-path";
import { getNextBestActionForSubject } from "@/lib/next-action";
import { UnitPath } from "@/components/learning-path/unit-path";

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
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const subject = await prisma.subject.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      chapters: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true },
          },
        },
      },
      quizzes: {
        where: {
          published: true,
          chapterId: null,
          OR: [{ userId: null }, { userId }],
        },
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true, difficulty: true },
      },
      subjectProfiles: true,
    },
  });

  if (!subject) notFound();

  const nextAction = await getNextBestActionForSubject(userId, subject.slug);

  // pentru fiecare modul, calculează learning path cu unități
  const chaptersWithPath = await Promise.all(
    subject.chapters.map(async (ch) => {
      const units = await getLearningPathForChapter(userId, ch.id);
      return { ...ch, units };
    })
  );

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

      {nextAction && (
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent-dark/5">
          <CardContent className="p-5">
            <p className="text-xs font-extrabold uppercase tracking-widest text-accent">{nextAction.meta}</p>
            <h3 className="mt-1 text-lg font-extrabold text-ink">{nextAction.title}</h3>
            <p className="text-sm text-subtle">{nextAction.description}</p>
            <Button asChild size="sm" className="mt-3">
              <Link href={nextAction.href}>Continuă →</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-10">
        <div>
          <h2 className="text-xl font-bold text-ink">Traseul tău de învățare</h2>
          <p className="text-sm text-subtle">Pași mici, clari. Băculeț te ghidează — tu doar continuă.</p>
        </div>
        {chaptersWithPath.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-subtle">
              Modulele pentru această materie se pregătesc.
            </CardContent>
          </Card>
        )}
        {chaptersWithPath.map((ch) => (
          <section key={ch.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-feather/40" />
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-subtle">{ch.title}</h3>
              <div className="h-px flex-1 bg-feather/40" />
            </div>
            <UnitPath subjectSlug={subject.slug} chapterSlug={ch.slug} units={ch.units} />
          </section>
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
