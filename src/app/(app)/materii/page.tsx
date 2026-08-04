import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PROFILE_LABELS: Record<string, string> = {
  REAL: "Real",
  HUMAN: "Uman",
  TECH: "Tehnologic",
};

export default async function SubjectsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [subjects, completedLessons] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { order: "asc" },
      include: {
        chapters: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" }, select: { id: true } } },
        },
        subjectProfiles: true,
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true },
    }),
  ]);

  const completedIds = new Set(completedLessons.map((l) => l.lessonId));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Materii</h1>
        <p className="mt-1 text-subtle">
          Alege o materie și parcurge capitolele pas cu pas.
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject, i) => {
          const lessons = subject.chapters.flatMap((c) => c.lessons);
          const done = lessons.filter((l) => completedIds.has(l.id)).length;
          const pct = lessons.length
            ? Math.round((done / lessons.length) * 100)
            : 0;

          return (
            <Link key={subject.id} href={`/materii/${subject.slug}`}>
              <Card
                className={cn(
                  "animate-slide-up surface-hover h-full rounded-3xl border p-5"
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent>
                  <div className="mb-4 flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-2xl">
                      {subject.icon}
                    </span>
                    <ChevronRight className="h-5 w-5 text-subtle" />
                  </div>
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-ink">
                    {subject.name}
                  </h2>
                  {subject.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-subtle">
                      {subject.description}
                    </p>
                  )}
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                      <span className="text-subtle">
                        {subject.chapters.length} capitole · {lessons.length} lecții
                      </span>
                      <span className="text-accent">{pct}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-subtle">
                      {done}/{lessons.length} lecții parcurse
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subject.subjectProfiles.map((sp) => (
                      <span
                        key={sp.profile}
                        className="rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-subtle"
                      >
                        {PROFILE_LABELS[sp.profile]}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
