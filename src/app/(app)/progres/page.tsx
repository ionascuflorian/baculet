import Link from "next/link";
import { Flame, BookOpen, ListChecks, Trophy, Award, Brain } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BadgeGrid } from "@/components/badges/badge-grid";
import { getDueReviews, getWeakConcepts } from "@/lib/spaced-repetition";
import { Button } from "@/components/ui/button";

export default async function ProgressPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, subjects, attempts, allDone, stepDone, dueReviews, weak, totalQuizCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { streakCount: true, lastActiveAt: true },
    }),
    prisma.subject.findMany({
      orderBy: { order: "asc" },
      include: {
        chapters: { include: { lessons: { select: { id: true } } } },
      },
    }),
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { quiz: { include: { subject: true } } },
    }),
    prisma.lessonProgress.findMany({ where: { userId }, select: { lessonId: true } }),
    prisma.lessonStepProgress.findMany({ where: { userId }, select: { stepId: true } }),
    getDueReviews(userId, 5),
    getWeakConcepts(userId, 4),
    prisma.quizAttempt.count({ where: { userId } }),
  ]);

  const doneIds = new Set(allDone.map((d) => d.lessonId));
  const totalLessons = subjects.reduce(
    (acc, s) => acc + s.chapters.reduce((a, c) => a + c.lessons.length, 0),
    0
  );

  const subjectProgress = subjects.map((s) => {
    const lessons = s.chapters.flatMap((c) => c.lessons);
    const done = lessons.filter((l) => doneIds.has(l.id)).length;
    return {
      id: s.id,
      icon: s.icon,
      name: s.name,
      slug: s.slug,
      done,
      total: lessons.length,
      pct: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
    };
  });

  const avgPct = attempts.length
    ? Math.round(
        attempts.reduce((a, t) => a + t.score / t.maxScore, 0) / attempts.length * 100
      )
    : 0;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Progresul tău</h1>
        <p className="mt-1 text-subtle">
          Un tablou complet cu ritmul tău de studiu.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15">
            <Flame className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink">{user?.streakCount ?? 0}</p>
            <p className="text-xs font-semibold text-subtle">zile în serie</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <BookOpen className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink">
              {doneIds.size}
              <span className="text-subtle">/{totalLessons}</span>
            </p>
            <p className="text-xs font-semibold text-subtle">lecții parcurse</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <ListChecks className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink">{totalQuizCount}</p>
            <p className="text-xs font-semibold text-subtle">teste rezolvate</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10">
            <Trophy className="h-6 w-6 text-danger" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink">{avgPct}%</p>
            <p className="text-xs font-semibold text-subtle">media la teste</p>
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Progres pe materii</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjectProgress.map((sp) => (
            <Link
              key={sp.id}
              href={`/materii/${sp.slug}`}
              className="block rounded-2xl p-3 transition-colors hover:bg-feather/40"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-ink">
                  {sp.icon} {sp.name}
                </span>
                <span className="text-sm font-bold text-subtle">
                  {sp.done}/{sp.total} · {sp.pct}%
                </span>
              </div>
              <Progress value={sp.pct} />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-accent" /> Insigne</CardTitle>
        </CardHeader>
        <CardContent>
          <BadgeGrid stats={{ streakCount: user?.streakCount ?? 0, lessonsDone: doneIds.size, quizCount: totalQuizCount, stepsDone: stepDone.length }} />
        </CardContent>
      </Card>

      {(dueReviews.length > 0 || weak.length > 0) && (
        <Card className="border-warning/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-warning" /> Repetiție spațiată</CardTitle>
            <Button asChild size="sm" variant="outline"><Link href="/recapitulare">Recapitulare</Link></Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueReviews.length > 0 && (
              <div>
                <p className="text-sm font-bold text-ink mb-2">{dueReviews.length} concepte de revizuit acum</p>
                {dueReviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="rounded-xl border border-feather p-3 mb-2">
                    <p className="text-sm font-bold text-ink line-clamp-2">{r.question.text}</p>
                    <p className="text-xs text-subtle">{r.question.concept ?? "general"} · greșit {r.failCount}x</p>
                  </div>
                ))}
              </div>
            )}
            {weak.length > 0 && (
              <div>
                <p className="text-sm font-bold text-ink mb-2">Puncte slabe</p>
                {weak.map((w) => (
                  <div key={w.questionId} className="flex items-center justify-between rounded-xl bg-danger/5 px-3 py-2 mb-2">
                    <span className="text-sm font-semibold text-ink truncate">{w.question?.concept ?? w.question?.text.slice(0, 40)}</span>
                    <span className="text-xs font-bold text-danger">{w._sum.failCount} greșeli</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Istoric teste</CardTitle>
          <Badge>Ultimele {attempts.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {attempts.length === 0 && (
            <p className="text-sm text-subtle">
              Rezolvă primul test ca să vezi istoricul aici.{" "}
              <Link href="/materii" className="font-bold text-accent">
                Găsește un test
              </Link>
              .
            </p>
          )}
          {attempts.map((a) => {
            const pct = Math.round((a.score / a.maxScore) * 100);
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-feather p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{a.quiz.title}</p>
                  <p className="text-xs text-subtle">
                    {a.quiz.subject.icon} {a.quiz.subject.name} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="w-24">
                    <Progress value={pct} />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-extrabold",
                      pct >= 50 ? "text-success" : "text-danger"
                    )}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
