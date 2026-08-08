import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

// XP compozit (anti-farming: contează doar cel mai bun scor per test):
//   - test: +10 XP per răspuns corect în cel mai bun attempt per test
//   - lecție completată: +25 XP (o dată)
//   - bonus streak: +5 XP × streak-ul curent (doar „tot timpul")

export const XP_PER_ANSWER = 10;
export const XP_PER_LESSON = 25;
export const XP_PER_STREAK = 5;

export function startOfWeekUtc(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7; // duminică → 7
  d.setUTCDate(d.getUTCDate() - (day - 1)); // luni 00:00 UTC
  return d;
}

export interface XpBreakdown {
  quizXp: number;
  lessonXp: number;
  streakXp: number;
  total: number;
}

export interface XpBreakdowns {
  allTime: XpBreakdown;
  week: XpBreakdown;
}

export async function getXpBreakdowns(userId: string): Promise<XpBreakdowns> {
  const weekStart = startOfWeekUtc();
  const [attempts, lessons, streak] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId },
      select: { quizId: true, score: true, createdAt: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { completedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { streakCount: true },
    }),
  ]);

  const best = new Map<string, number>();
  const bestWeek = new Map<string, number>();
  for (const a of attempts) {
    const key = a.quizId;
    const cur = best.get(key) ?? -1;
    if (a.score > cur) best.set(key, a.score);
    if (a.createdAt >= weekStart && a.score > (bestWeek.get(key) ?? -1))
      bestWeek.set(key, a.score);
  }

  const quizXp = [...best.values()].reduce((s, v) => s + v, 0) * XP_PER_ANSWER;
  const quizXpWeek =
    [...bestWeek.values()].reduce((s, v) => s + v, 0) * XP_PER_ANSWER;
  const lessonXp = lessons.length * XP_PER_LESSON;
  const lessonXpWeek =
    lessons.filter((l) => l.completedAt >= weekStart).length * XP_PER_LESSON;
  const streakXp = (streak?.streakCount ?? 0) * XP_PER_STREAK;

  const allTime = {
    quizXp,
    lessonXp,
    streakXp,
    total: quizXp + lessonXp + streakXp,
  };
  const week = {
    quizXp: quizXpWeek,
    lessonXp: lessonXpWeek,
    streakXp: 0,
    total: quizXpWeek + lessonXpWeek,
  };
  return { allTime, week };
}

export interface BoardRow {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  xp: number;
}

// Subquery comun: xp per utilizator (fără streak pe „săptămâna asta”).
function xpSelectSql(weekStart: Date | null) {
  return Prisma.sql`
    (SELECT u.id, u.name, u.username, u.image,
       (COALESCE(q.xp, 0) + COALESCE(l.xp, 0) + ${weekStart ? Prisma.sql`0` : Prisma.sql`COALESCE(s."streakCount" * ${XP_PER_STREAK}, 0)`}) AS xp
     FROM "User" u
     LEFT JOIN (
       SELECT "userId", SUM("best") * ${XP_PER_ANSWER} AS xp FROM (
         SELECT DISTINCT ON ("userId", "quizId") "userId", "quizId", "score" AS "best"
         FROM "QuizAttempt"
         ${weekStart ? Prisma.sql`WHERE "createdAt" >= ${weekStart}` : Prisma.empty}
         ORDER BY "userId", "quizId", "score" DESC
       ) t GROUP BY "userId"
     ) q ON q."userId" = u.id
     LEFT JOIN (
       SELECT "userId", COUNT(*) * ${XP_PER_LESSON} AS xp
       FROM "LessonProgress"
       ${weekStart ? Prisma.sql`WHERE "completedAt" >= ${weekStart}` : Prisma.empty}
       GROUP BY "userId"
     ) l ON l."userId" = u.id
     LEFT JOIN "User" s ON s.id = u.id)`;
}

export async function getLeaderboard(opts: {
  weekStart: Date | null;
  friendIds?: string[];
  limit?: number;
}): Promise<BoardRow[]> {
  const { weekStart, friendIds, limit = 100 } = opts;
  // Fără prieteni nu există clasament de prieteni — nu returna lista globală.
  if (friendIds && friendIds.length === 0) return [];
  const rows = await prisma.$queryRaw<BoardRow[]>`
    SELECT t.id, t.name, t.username, t.image, t.xp
    FROM ${xpSelectSql(weekStart)} t
    ${friendIds && friendIds.length > 0 ? Prisma.sql`WHERE t.id = ANY(${friendIds})` : Prisma.empty}
    ORDER BY t.xp DESC, t.name ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ ...r, xp: Number(r.xp) }));
}

export async function getUserRank(opts: {
  userId: string;
  weekStart: Date | null;
}): Promise<number> {
  const { userId, weekStart } = opts;
  const [rows] = await Promise.all([
    prisma.$queryRaw<{ rank: number }[]>`
      SELECT COUNT(*)::int + 1 AS rank
      FROM ${xpSelectSql(weekStart)} t
      WHERE t.xp > (SELECT COALESCE(MAX(tt.xp), 0) FROM ${xpSelectSql(weekStart)} tt WHERE tt.id = ${userId})
    `,
  ]);
  const rank = rows[0]?.rank ?? 1;
  return rank;
}
