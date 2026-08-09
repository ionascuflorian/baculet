import webpush from "web-push";
import { prisma } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/mail";
import { addDays } from "@/lib/streak";

export type NotifType = "streak" | "follow" | "reminder";

export interface NotifPayload {
  title: string;
  body: string;
  url: string;
}

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:support@baculet.ro";

let vapidSet = false;
function ensureVapid() {
  if (!vapidSet && VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidSet = true;
  }
}

// ---------------------------------------------------------------------------
// Timezone helpers (serverele rulează în UTC; noi lucrăm în timpul local al
// utilizatorului).
// ---------------------------------------------------------------------------

export function getUserTz(timezone: string | null): string {
  return timezone || "Europe/Bucharest";
}

// Offset-ul în minute față de UTC al zonei `tz` la momentul `at`.
export function tzOffsetMinutes(tz: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = Object.fromEntries(
      dtf.formatToParts(at).map((p) => [p.type, p.value])
    );
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24,
      Number(parts.minute),
      Number(parts.second)
    );
    return Math.round((asUTC - at.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

// Startul zilei locale de azi (ca instant UTC).
export function localStartOfTodayUtc(tz: string, now: Date = new Date()): Date {
  const off = tzOffsetMinutes(tz, now);
  const shifted = new Date(now.getTime() + off * 60_000);
  const localStart = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  );
  return new Date(localStart.getTime() - off * 60_000);
}

// Ora locală curentă (0-23).
export function localHour(tz: string, now: Date = new Date()): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
    });
    return Number(dtf.formatToParts(now).find((p) => p.type === "hour")?.value) % 24;
  } catch {
    return now.getUTCHours();
  }
}

// Termenul-limită al seriei, calculat în timpul local al utilizatorului:
// începutul zilei locale în care a fost ultima activitate + 2 zile.
export function streakDeadlineInTz(
  lastActiveAt: Date,
  tz: string
): Date | null {
  try {
    const off = tzOffsetMinutes(tz, lastActiveAt);
    const shifted = new Date(lastActiveAt.getTime() + off * 60_000);
    const localDayStart = new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
    );
    const utcDayStart = new Date(localDayStart.getTime() - off * 60_000);
    return addDays(utcDayStart, 2);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trimitere notificări
// ---------------------------------------------------------------------------

async function sendPush(
  userId: string,
  payload: NotifPayload
): Promise<void> {
  ensureVapid();
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId, enabled: true },
  });
  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const keys = (sub.keys ?? {}) as {
          p256dh?: string;
          auth?: string;
        };
        if (!keys.p256dh || !keys.auth) return;
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: keys.p256dh, auth: keys.auth },
          },
          data
        );
      } catch (err) {
        // 404/410 → abonamentul nu mai e valid (browser dezabonat).
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        } else {
          console.error("webpush error:", err);
        }
      }
    })
  );
}

async function sendEmail(
  user: { email: string; name: string },
  payload: NotifPayload
): Promise<void> {
  await sendNotificationEmail({
    to: user.email,
    name: user.name,
    title: payload.title,
    message: `${payload.body}\n\n${payload.url}`,
  });
}

/**
 * Trimite o notificare către un utilizator (push + email), respectând
 * preferințele lui. `type` controlează comutatoarele din setări:
 * streak → streakNotifs, follow → followNotifs, reminder → reminderHour.
 */
export async function notifyUser(
  userId: string,
  type: NotifType,
  payload: NotifPayload
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      emailNotifs: true,
      streakNotifs: true,
      followNotifs: true,
      reminderHour: true,
    },
  });
  if (!user) return;

  if (type === "streak" && !user.streakNotifs) return;
  if (type === "follow" && !user.followNotifs) return;
  if (type === "reminder" && user.reminderHour == null) return;

  const tasks: Promise<unknown>[] = [];

  if (user.emailNotifs) {
    tasks.push(sendEmail(user, payload));
  }
  tasks.push(sendPush(userId, payload));

  await Promise.allSettled(tasks);
}
