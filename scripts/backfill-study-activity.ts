// Backfill istoric StudyActivity din lecțiile finalizate și testele rezolvate.
// Rulat o singură dată (local, împotriva DB-ului partajat): npx tsx scripts/backfill-study-activity.ts
import { prisma } from "../src/lib/db";
import { startOfDay } from "../src/lib/streak";

async function main() {
  const today = startOfDay(new Date());

  const [lessons, attempts] = await Promise.all([
    prisma.lessonProgress.findMany({
      select: { userId: true, completedAt: true },
    }),
    prisma.quizAttempt.findMany({
      select: { userId: true, createdAt: true },
    }),
  ]);

  const perUser = new Map<
    string,
    Map<string, { date: Date; count: number }>
  >();

  const bucket = (userId: string, when: Date) => {
    const day = startOfDay(new Date(when));
    if (day.getTime() >= today.getTime()) return; // nu atingem ziua curentă
    const days = perUser.get(userId) ?? new Map();
    const key = day.toISOString();
    const cur = days.get(key) ?? { date: day, count: 0 };
    cur.count += 1;
    days.set(key, cur);
    perUser.set(userId, days);
  };

  for (const l of lessons) bucket(l.userId, l.completedAt);
  for (const a of attempts) bucket(a.userId, a.createdAt);

  let total = 0;
  for (const [userId, days] of perUser) {
    for (const { date, count } of days.values()) {
      await prisma.studyActivity.upsert({
        where: { userId_date: { userId, date } },
        update: { count: { increment: count } },
        create: { userId, date, count },
      });
      total += 1;
    }
  }

  console.log(`Backfill gata: ${total} zile de studiu pentru ${perUser.size} utilizatori.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
