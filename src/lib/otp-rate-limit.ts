import { prisma } from "@/lib/db";

// Limită pe verificarea codurilor OTP (brute-force pe 6 cifre): max 5 încercări
// greșite per email+IP într-o fereastră de 15 minute.
const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS = 15 * 60 * 1000;

// Limită pe cererile de trimitere a codului (anti email-bombing).
const REQUEST_MAX = 3;
const REQUEST_WINDOW_MS = 10 * 60 * 1000;

// Increment atomic cu advisory lock per cheie: serializăm citirea-scrierea
// contorului ca să nu putem depăși limita prin cereri concurente.
async function consume(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();

  return prisma.$transaction(async (tx) => {
    const hash = [...key].reduce(
      (acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0,
      0
    );
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${hash}::bigint)`;

    const row = await tx.siteSetting.findUnique({ where: { key } });
    const value = row
      ? (row.value as { count?: number; windowStart?: number } | null)
      : null;

    const expired = !value?.windowStart || now - value.windowStart >= windowMs;
    const count = expired ? 1 : (value.count ?? 0) + 1;
    const windowStart = expired ? now : value.windowStart;

    if (!expired && count > max) return false; // Peste limită în fereastra curentă — nu scriem nimic.

    await tx.siteSetting.upsert({
      where: { key },
      update: { value: { count, windowStart } },
      create: { key, value: { count, windowStart } },
    });
    return true;
  });
}

export async function otpVerifyRateLimit(
  email: string,
  ip: string
): Promise<boolean> {
  return consume(`otp-failures:${email}:${ip}`, OTP_MAX_ATTEMPTS, OTP_WINDOW_MS);
}

export async function otpVerifyRateLimitSuccess(
  email: string,
  ip: string
): Promise<void> {
  await prisma.siteSetting.deleteMany({ where: { key: `otp-failures:${email}:${ip}` } });
}

export async function otpRequestRateLimit(email: string): Promise<boolean> {
  return consume(`otp-requests:${email}`, REQUEST_MAX, REQUEST_WINDOW_MS);
}

// Limită pe înregistrări noi (anti spambot pe IP).
const REGISTER_MAX = 10;
const REGISTER_WINDOW_MS = 30 * 60 * 1000;

export async function registerRateLimit(ip: string): Promise<boolean> {
  return consume(`register:${ip}`, REGISTER_MAX, REGISTER_WINDOW_MS);
}

// Limită pe formurile publice (feedback/contact) — anti abuz pe IP.
const FEEDBACK_MAX = 5;
const FEEDBACK_WINDOW_MS = 10 * 60 * 1000;

export async function feedbackRateLimit(ip: string): Promise<boolean> {
  return consume(`feedback:${ip}`, FEEDBACK_MAX, FEEDBACK_WINDOW_MS);
}