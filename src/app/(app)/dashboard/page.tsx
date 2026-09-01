import { redirect } from "next/navigation";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalizePrefs, visibleWidgets } from "@/lib/dashboard-widgets";
import { GreetingWidget } from "@/components/dashboard/widget-greeting";
import { WeatherWidget } from "@/components/dashboard/widget-weather";
import { isWeatherLocation } from "@/lib/weather-location";
import { CalendarWidget } from "@/components/dashboard/widget-calendar";
import { BacCountdownWidget } from "@/components/dashboard/widget-bac-countdown";
import { ResumeWidget } from "@/components/dashboard/widget-resume";
import { WeakWidget } from "@/components/dashboard/widget-weak";
import { ProgressWidget } from "@/components/dashboard/widget-progress";
import { RecentWidget } from "@/components/dashboard/widget-recent";
import { PomodoroWidget } from "@/components/dashboard/widget-pomodoro";
import { TodoWidget } from "@/components/dashboard/widget-todo";
import { StreakWidget } from "@/components/dashboard/widget-streaks";
import { LeaderboardWidget } from "@/components/dashboard/widget-leaderboard";
import { WidgetSettings } from "@/components/dashboard/widget-settings";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { syncCalendarEvents } from "@/lib/calendar-sync";
import { getBacSchedule } from "@/lib/site-settings";
import { getStudyActivities } from "@/lib/study-activity";
import { startOfDay } from "@/lib/streak";
import { ProfilePrompt } from "@/components/profile/profile-prompt";
import { getDueReviews } from "@/lib/spaced-repetition";
import { RecapWidget } from "@/components/recap/recap-widget";
import { getGlobalNextAction } from "@/lib/next-action";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, subjects, completedLessons, recentAttempts, quizCount, todoItems, studyActivities, dueReviews, globalAction, weakMastery, allConcepts] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          streakCount: true,
          dashboardWidgets: true,
          lastActiveAt: true,
          weatherLocation: true,
          profile: true,
          onboardingDone: true,
        },
      }),
      prisma.subject.findMany({
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          chapters: {
            orderBy: { order: "asc" },
            select: {
              slug: true,
              title: true,
              lessons: {
                orderBy: { order: "asc" },
                select: { id: true, slug: true, title: true },
              },
            },
          },
        },
      }),
      prisma.lessonProgress.findMany({
        where: { userId },
        select: { lessonId: true, completedAt: true },
      }),
      prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: { quiz: { include: { subject: true } } },
      }),
      prisma.quizAttempt.count({ where: { userId } }),
      prisma.todoItem.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        select: { id: true, text: true, done: true, order: true },
      }),
      getStudyActivities(userId),
      getDueReviews(userId, 3),
      getGlobalNextAction(userId),
      prisma.userConceptProgress.findMany({
        where: { userId, mastery: { lt: 60 } },
        orderBy: { mastery: "asc" },
        take: 3,
        include: { concept: { select: { name: true } } },
      }),
      prisma.userConceptProgress.findMany({
        where: { userId },
        include: {
          concept: {
            include: {
              lesson: { include: { chapter: { include: { subject: { select: { id: true } } } } } },
              unit: { include: { chapter: { include: { subject: { select: { id: true } } } } } },
            },
          },
        },
      }),
    ]);

  const prefs = normalizePrefs(user?.dashboardWidgets);
  const visible = visibleWidgets(prefs);

  // Sincronizarea calendarului (evenimente BAC + realizări) nu blochează
  // răspunsul; rulează după ce pagina a fost trimisă.
  after(() => {
    void syncCalendarEvents(userId, {
      streakCount: user?.streakCount ?? 0,
      lessonsDone: completedLessons.length,
      quizCount,
    });
  });

  const calendarEvents = await prisma.calendarEvent.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { id: true, date: true, title: true, color: true, kind: true },
  });

  const completedIds = new Set(completedLessons.map((l) => l.lessonId));
  const allLessons = subjects.flatMap((s) =>
    s.chapters.flatMap((c) =>
      c.lessons.map((l) => ({
        ...l,
        subject: s,
        chapter: { slug: c.slug, title: c.title },
      }))
    )
  );
  const totalLessons = allLessons.length;
  const doneCount = completedLessons.length;
  const totalChapters = subjects.reduce((n, s) => n + s.chapters.length, 0);
  const chaptersDone = subjects.reduce(
    (n, s) =>
      n +
      s.chapters.filter((c) => c.lessons.every((l) => completedIds.has(l.id)))
        .length,
    0
  );

  const nextLesson = allLessons.find((l) => !completedIds.has(l.id));
  const firstName = user?.name?.split(" ")[0] ?? "";
  const streak = user?.streakCount ?? 0;

  const bacSchedule = await getBacSchedule();

  // Mastery mediu per materie, din progresul pe concepte.
  const masteryBySubject = new Map<string, { sum: number; count: number }>();
  for (const c of allConcepts) {
    const sid =
      c.concept.lesson?.chapter.subject.id ??
      c.concept.unit?.chapter.subject.id;
    if (!sid) continue;
    const agg = masteryBySubject.get(sid) ?? { sum: 0, count: 0 };
    agg.sum += c.mastery;
    agg.count++;
    masteryBySubject.set(sid, agg);
  }
  const subjectMastery = subjects
    .filter((s) => masteryBySubject.has(s.id))
    .map((s) => {
      const agg = masteryBySubject.get(s.id)!;
      return {
        slug: s.slug,
        name: s.name,
        mastery: Math.round(agg.sum / agg.count),
      };
    });

  if (!user?.onboardingDone) redirect("/onboarding");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-subtle">
            Tot ce contează azi, dintr-o privire.
          </p>
        </div>
        <WidgetSettings prefs={prefs} />
      </div>

      <ProfilePrompt profileSet={!!user?.profile} />

      <DashboardGrid prefs={prefs}>
        {visible.flatMap((id) => {
          switch (id) {
            case "greeting":
              return {
                id,
                node: (
                  <GreetingWidget
                    firstName={firstName}
                    streakCount={streak}
                    lastActiveAt={
                      user?.lastActiveAt ? user.lastActiveAt.toISOString() : null
                    }
                  />
                ),
              };
            case "bac":
              return {
                id,
                node: (
                  <BacCountdownWidget
                    startDate={bacSchedule.startDate || null}
                    endDate={bacSchedule.endDate || null}
                    nextSessionStartDate={bacSchedule.nextSessionStartDate || null}
                  />
                ),
              };
            case "weather": {
              const weatherLocation = isWeatherLocation(user?.weatherLocation)
                ? user.weatherLocation
                : null;
              return {
                id,
                node: <WeatherWidget initialLocation={weatherLocation} />,
              };
            }
            case "calendar":
              return {
                id,
                node: (
                  <CalendarWidget
                    events={calendarEvents.map((e) => ({
                      ...e,
                      date: e.date.toISOString(),
                    }))}
                  />
                ),
              };
            case "resume":
              return {
                id,
                node: (
                  <ResumeWidget
                    nextLesson={nextLesson}
                    doneCount={doneCount}
                    totalLessons={totalLessons}
                    totalChapters={totalChapters}
                    chaptersDone={chaptersDone}
                    nextAction={globalAction}
                  />
                ),
              };
            case "weak":
              return {
                id,
                node: (
                  <WeakWidget
                    items={weakMastery.map((w) => ({
                      conceptId: w.conceptId,
                      mastery: w.mastery,
                      concept: { name: w.concept.name },
                    }))}
                  />
                ),
              };
            case "progress":
              return { id, node: <ProgressWidget subjects={subjectMastery} /> };
            case "recap":
              return {
                id,
                node: (
                  <RecapWidget
                    dueCount={dueReviews.length}
                    items={dueReviews.map((r) => ({
                      id: r.id,
                      text: r.question.text,
                      concept: r.question.concept,
                      quizTitle: r.question.quiz.title,
                      failCount: r.failCount,
                    }))}
                  />
                ),
              };
            case "recent":
              return {
                id,
                node: (
                  <RecentWidget
                    attempts={recentAttempts.map((a) => ({
                      id: a.id,
                      quiz: {
                        title: a.quiz.title,
                        subject: { name: a.quiz.subject.name },
                      },
                      score: a.score,
                      maxScore: a.maxScore,
                    }))}
                  />
                ),
              };
            case "pomodoro":
              return { id, node: <PomodoroWidget /> };
            case "todo":
              return { id, node: <TodoWidget items={todoItems} /> };
            case "streaks":
              return {
                id,
                node: (
                  <StreakWidget
                    streakCount={streak}
                    lastActiveAt={
                      user?.lastActiveAt ? user.lastActiveAt.toISOString() : null
                    }
                    activities={studyActivities}
                    today={startOfDay(new Date()).toISOString()}
                  />
                ),
              };
            case "leaderboard":
              return {
                id,
                node: <LeaderboardWidget userId={userId} />,
              };
            default:
              return [];
          }
        })}
      </DashboardGrid>
    </div>
  );
}

