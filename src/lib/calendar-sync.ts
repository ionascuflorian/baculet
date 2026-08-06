import { prisma } from "@/lib/db";
import {
  achievementEvents,
  ACHIEVEMENT_COLOR,
  EXAM_COLOR,
  type AchievementStats,
} from "@/lib/achievements";
import { getBacSchedule } from "@/lib/site-settings";

interface PendingEvent {
  key: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: "ACHIEVEMENT" | "EXAM";
  color: string | null;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function syncCalendarEvents(
  userId: string,
  stats: AchievementStats
): Promise<void> {
  const schedule = await getBacSchedule();
  const pending: PendingEvent[] = [
    ...achievementEvents(stats).map((e) => ({
      ...e,
      date: todayStr(),
      color: ACHIEVEMENT_COLOR,
    })),
    ...(schedule.startDate
      ? [{
          key: "bac:start",
          title: "BAC — începe",
          date: schedule.startDate,
          kind: "EXAM" as const,
          color: EXAM_COLOR,
        }]
      : []),
    ...(schedule.endDate
      ? [{
          key: "bac:end",
          title: "BAC — se termină",
          date: schedule.endDate,
          kind: "EXAM" as const,
          color: EXAM_COLOR,
        }]
      : []),
    ...(schedule.nextSessionStartDate
      ? [{
          key: "bac:next",
          title: "BAC — sesiunea următoare începe",
          date: schedule.nextSessionStartDate,
          kind: "EXAM" as const,
          color: EXAM_COLOR,
        }]
      : []),
    ...(schedule.events ?? []).map((ev, i) => ({
      key: `bac:event:${i}:${ev.date}`,
      title: ev.title,
      date: ev.date,
      kind: "EXAM" as const,
      color: EXAM_COLOR,
    })),
  ];

  if (pending.length === 0) return;

  await prisma.calendarEvent.createMany({
    data: pending.map((e) => ({
      userId,
      title: e.title,
      date: new Date(`${e.date}T00:00:00Z`),
      color: e.color,
      kind: e.kind,
      key: e.key,
    })),
    skipDuplicates: true,
  });
}
