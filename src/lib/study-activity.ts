import { prisma } from "@/lib/db";
import { addDays, startOfDay } from "@/lib/streak";

// Un „zi de studiu” e normalizat la începutul zilei (UTC), la fel cum
// funcționează seria (streak). O singură acțiune contează ca zi activă,
// dar de mai multe acțiuni în aceeași zi crește `count` (pentru intensitate).

export async function recordStudyActivity(userId: string): Promise<void> {
  const date = startOfDay(new Date());
  await prisma.studyActivity.upsert({
    where: { userId_date: { userId, date } },
    update: { count: { increment: 1 } },
    create: { userId, date, count: 1 },
  });
}

export interface StudyActivityDay {
  date: string; // ISO
  count: number;
}

export async function getStudyActivities(
  userId: string,
  days = 365
): Promise<StudyActivityDay[]> {
  const from = addDays(startOfDay(new Date()), -(days - 1));
  const rows = await prisma.studyActivity.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: "asc" },
    select: { date: true, count: true },
  });
  return rows.map((r) => ({ date: r.date.toISOString(), count: r.count }));
}
