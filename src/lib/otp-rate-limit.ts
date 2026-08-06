import { prisma } from "@/lib/db";

// Limită pe verificarea codurilor OTP (brute-force pe 6 cifre): max 5 încercări
// greșite per email+IP într-o fereastră de 15 minute.
const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS = 15 * 60 * 1000;

// Limită pe cererile de trimitere a codului (anti email-bombing).
const REQUEST_MAX = 3;
const REQUEST_WINDOW_MS = 10 * 60 * 1000;

async function consume(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (row) {
    const value = row.value as { count?: number; windowStart?: number } | null;
    if (value?.windowStart && now - value.windowStart < windowMs) {
      if ((value.count ?? 0) >= max) return false;
      await prisma.siteSetting.update({
        where: { key },
        data: {
          value: { count: (value.count ?? 0) + 1, windowStart: value.windowStart },
        },
      });
      return true;
    }
  }
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: { count: 1, windowStart: now } },
    create: { key, value: { count: 1, windowStart: now } },
  });
  return true;
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
