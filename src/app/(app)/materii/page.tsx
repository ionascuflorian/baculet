import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isProfileId } from "@/lib/profile";
import { SubjectCard, type SubjectCardData } from "@/components/materii/subject-card";
import { ProfileBanner } from "@/components/materii/profile-banner";

type SubjectWithProgress = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  chapters: {
    slug: string;
    title: string;
    lessons: { id: string }[];
  }[];
  subjectProfiles: { profile: string }[];
};

function toCardData(
  subject: SubjectWithProgress,
  completedIds: Set<string>
): SubjectCardData {
  const lessons = subject.chapters.flatMap((c) => c.lessons);
  const done = lessons.filter((l) => completedIds.has(l.id)).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  return {
    id: subject.id,
    slug: subject.slug,
    name: subject.name,
    icon: subject.icon,
    description: subject.description,
    chaptersCount: subject.chapters.length,
    lessonsCount: lessons.length,
    done,
    pct,
    profiles: subject.subjectProfiles.map((sp) => sp.profile),
  };
}

export default async function SubjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, subjects, completedLessons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { profile: true },
    }),
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
  const userProfile = isProfileId(user?.profile) ? user.profile : null;

  const all = subjects.map((s) => toCardData(s, completedIds));
  const relevant = userProfile
    ? all.filter((s) => s.profiles.includes(userProfile))
    : [];
  const other = userProfile
    ? all.filter((s) => !s.profiles.includes(userProfile))
    : [];

  const renderGrid = (list: SubjectCardData[], dimmed = false) => (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((subject, i) => (
        <SubjectCard key={subject.id} subject={subject} index={i} dimmed={dimmed} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Materii</h1>
        <p className="mt-1 text-subtle">
          Alege o materie și parcurge capitolele pas cu pas.
        </p>
      </section>

      {!userProfile && <ProfileBanner />}

      {userProfile && (
        <section className="space-y-5">
          <header>
            <h2 className="text-lg font-extrabold text-ink">Materiile tale</h2>
            <p className="text-sm text-subtle">
              Vizibile în funcție de profilul tău de studiu.
            </p>
          </header>
          {relevant.length > 0 ? (
            renderGrid(relevant)
          ) : (
            <p className="surface rounded-3xl border p-6 text-sm text-subtle">
              Nicio materie disponibilă pentru profilul tău.
            </p>
          )}

          {other.length > 0 && (
            <details className="group rounded-3xl border border-feather bg-card/50 p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl">
                <span className="flex items-center gap-2 font-extrabold text-ink">
                  Alte materii
                  <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-bold text-subtle">
                    {other.length}
                  </span>
                </span>
                <span className="text-xs font-bold text-subtle transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-4">
                <p className="mb-4 text-sm text-subtle">
                  Materii care nu sunt în programa profilului tău, dar le poți
                  explora dacă vrei.
                </p>
                {renderGrid(other, true)}
              </div>
            </details>
          )}
        </section>
      )}

      {!userProfile && renderGrid(all)}
    </div>
  );
}
