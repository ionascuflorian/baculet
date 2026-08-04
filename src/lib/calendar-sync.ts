import { prisma } from "@/lib/db";
import {
  achievementEvents,
  ACHIEVEMENT_COLOR,
  EXAM_COLOR,
  type AchievementStats,
} from "@/lib/achievements";
import { bacExamsForYear } from "@/lib/exam-dates";

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
  const year = new Date().getFullYear();
  const pending: PendingEvent[] = [
    ...achievementEvents(stats).map((e) => ({
      ...e,
      date: todayStr(),
      color: ACHIEVEMENT_COLOR,
    })),
    ...[year, year + 1].flatMap((y) =>
      bacExamsForYear(y).map((ex) => ({
        key: `exam:${y}:${ex.title}`,
        title: ex.title,
        date: ex.date,
        kind: "EXAM" as const,
        color: EXAM_COLOR,
      }))
    ),
  ];

  if (pending.length === 0) return;

  const keys = pending.map((e) => e.key);
  const existing = await prisma.calendarEvent.findMany({
    where: { userId, key: { in: keys } },
    select: { key: true },
  });
  const existingKeys = new Set(existing.map((e) => e.key));
  const toCreate = pending.filter((e) => !existingKeys.has(e.key));

  if (toCreate.length === 0) return;

  await prisma.calendarEvent.createMany({
    data: toCreate.map((e) => ({
      userId,
      title: e.title,
      date: new Date(`${e.date}T00:00:00Z`),
      color: e.color,
      kind: e.kind,
      key: e.key,
    })),
  });
}
