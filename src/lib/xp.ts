import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

// XP compozit (anti-farming: contează doar cel mai bun scor per test):
//   - test: +10 XP per răspuns corect în cel mai bun attempt per test
//   - lecție completată: +25 XP (o dată)
//   - pas de lecție: +5 XP
//   - bonus streak: +5 XP × streak-ul curent (doar „tot timpul")
//
// Singura implementare a formulei este `xpSelectSql`: breakdown-ul unui
// utilizator, clasamentul și rangul citesc toți aceeași subinterogare, ca
// formula XP să nu derive în implementări paralele.

export const XP_PER_ANSWER = 10;
export const XP_PER_LESSON = 25;
export const XP_PER_STEP = 5;
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

interface XpSqlRow {
  quiz_xp: bigint | number;
  lesson_xp: bigint | number;
  step_xp: bigint | number;
  streak_xp: bigint | number;
  xp: bigint | number;
}

// XP pe utilizator. `weekStart` dat filtrează la săptămâna curentă și
// elimină bonusul de streak („săptămâna asta" nu include seria).
function xpSelectSql(weekStart: Date | null) {
  return Prisma.sql`
    (SELECT u.id, u.name, u.username, u.image,
       (COALESCE(q.xp, 0) + COALESCE(l.xp, 0) + COALESCE(st.xp, 0)
        + ${weekStart ? Prisma.sql`0` : Prisma.sql`COALESCE(u."streakCount" * ${XP_PER_STREAK}, 0)`}) AS xp,
       COALESCE(q.xp, 0) AS quiz_xp,
       COALESCE(l.xp, 0) AS lesson_xp,
       COALESCE(st.xp, 0) AS step_xp,
       ${weekStart ? Prisma.sql`0` : Prisma.sql`COALESCE(u."streakCount" * ${XP_PER_STREAK}, 0)`} AS streak_xp
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
     LEFT JOIN (
       SELECT "userId", COUNT(*) * ${XP_PER_STEP} AS xp
       FROM "LessonStepProgress"
       ${weekStart ? Prisma.sql`WHERE "completedAt" >= ${weekStart}` : Prisma.empty}
       GROUP BY "userId"
     ) st ON st."userId" = u.id)`;
}

async function xpRow(userId: string, weekStart: Date | null): Promise<XpSqlRow> {
  const [row] = await prisma.$queryRaw<XpSqlRow[]>`
    SELECT t.quiz_xp, t.lesson_xp, t.step_xp, t.streak_xp, t.xp
    FROM ${xpSelectSql(weekStart)} t
    WHERE t.id = ${userId}
  `;
  const { quiz_xp = 0, lesson_xp = 0, step_xp = 0, streak_xp = 0, xp = 0 } = row ?? {};
  return { quiz_xp, lesson_xp, step_xp, streak_xp, xp };
}

function toBreakdown(row: XpSqlRow): XpBreakdown {
  return {
    quizXp: Number(row.quiz_xp),
    lessonXp: Number(row.lesson_xp) + Number(row.step_xp),
    streakXp: Number(row.streak_xp),
    total: Number(row.xp),
  };
}

export async function getXpBreakdowns(userId: string): Promise<XpBreakdowns> {
  const weekStart = startOfWeekUtc();
  const [allTime, week] = await Promise.all([
    xpRow(userId, null),
    xpRow(userId, weekStart),
  ]);
  return { allTime: toBreakdown(allTime), week: toBreakdown(week) };
}

export interface BoardRow {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  xp: number;
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