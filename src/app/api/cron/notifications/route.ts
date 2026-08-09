import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getUserTz,
  localHour,
  localStartOfTodayUtc,
  notifyUser,
  streakDeadlineInTz,
} from "@/lib/notify";

export const dynamic = "force-dynamic";

const WARNING_WINDOW_MS = 24 * 3600_000; // cu o zi înainte de termen

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === expected;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const now = new Date();
  let streakSent = 0;
  let reminderSent = 0;
  let checked = 0;

  const users = await prisma.user.findMany({
    where: {
      OR: [{ streakCount: { gt: 0 } }, { reminderHour: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      timezone: true,
      streakCount: true,
      lastActiveAt: true,
      streakNotifs: true,
      reminderHour: true,
      streakWarnedFor: true,
      reminderSentOn: true,
    },
  });

  for (const user of users) {
    const tz = getUserTz(user.timezone);
    checked++;

    // --- Streak în pericol: fereastra [deadline − 6h, deadline) ---
    if (
      user.streakCount > 0 &&
      user.lastActiveAt &&
      user.streakNotifs
    ) {
      const deadline = streakDeadlineInTz(user.lastActiveAt, tz);
      if (deadline) {
        const msLeft = deadline.getTime() - now.getTime();
        const warnedForThis = user.streakWarnedFor?.getTime() === deadline.getTime();
        if (msLeft > 0 && msLeft <= WARNING_WINDOW_MS && !warnedForThis) {
          const hoursLeft = Math.max(1, Math.ceil(msLeft / 3600_000));
          await notifyUser(user.id, "streak", {
            title: "Seria ta e în pericol!",
            body:
              hoursLeft <= 1
                ? `Mai ai mai puțin de o oră să înveți ca să nu pierzi seria de ${user.streakCount} ${
                    user.streakCount === 1 ? "zi" : "zile"
                  }.`
                : `Mai ai ~${hoursLeft}h să înveți ca să nu pierzi seria de ${user.streakCount} ${
                    user.streakCount === 1 ? "zi" : "zile"
                  }.`,
            url: "/dashboard",
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { streakWarnedFor: deadline },
          });
          streakSent++;
        }
      }
    }

    // --- Amintire zilnică: ora setată (sau cu până la 3h după, ca să
    // acopere abaterea de ±59 min a cron-ului pe planul Hobby, unde o
    // singură rulare pe zi poate „prinde" mai multe ore alese) ---
    if (user.reminderHour != null) {
      const todayStart = localStartOfTodayUtc(tz, now);
      const activeToday = !!user.lastActiveAt && user.lastActiveAt >= todayStart;
      const alreadySent = !!user.reminderSentOn && user.reminderSentOn >= todayStart;
      const localH = localHour(tz, now);
      if (localH >= user.reminderHour && localH < user.reminderHour + 3 && !activeToday && !alreadySent) {
        await notifyUser(user.id, "reminder", {
          title: "Hai să înveți azi!",
          body:
            user.streakCount > 0
              ? `Seria ta e de ${user.streakCount} ${
                  user.streakCount === 1 ? "zi" : "zile"
                }. Câteva minute azi și e în siguranță.`
              : "Câteva minute de exerciții își fac treaba.",
          url: "/dashboard",
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { reminderSentOn: todayStart },
        });
        reminderSent++;
      }
    }
  }

  return NextResponse.json({ ok: true, checked, streakSent, reminderSent });
}
