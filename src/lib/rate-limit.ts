import { prisma } from "@/lib/db";

// Un singur modul pentru toată limitarea de trafic și identitatea clientului.
// Bucket-urile se stochează în DB (Postgres) ca să fie partajate corect între
// instanțe (serverless); incrementările concurente se serializează cu un
// advisory lock per cheie.

// ── Client identity ─────────────────────────────────────────────
type HeadersLike = { get(name: string): string | null | undefined };

// Sursa unică pentru identificarea IP-ului clientului. In consola de proxy
// (Vercel) IP-ul real vine în `x-forwarded-for`; fallback pe `x-real-ip`.
export function clientIp(headers: HeadersLike): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}

// ── Bucket generic ──────────────────────────────────────────────
// Increment atomic cu advisory lock per cheie: serializăm citirea-scrierea
// contorului ca să nu putem depăși limita prin cereri concurente.
export async function consumeBucket(
  key: string,
  limit: number,
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

    if (!expired && count > limit) return false;

    await tx.siteSetting.upsert({
      where: { key },
      update: { value: { count, windowStart } },
      create: { key, value: { count, windowStart } },
    });
    return true;
  });
}

export async function clearBucket(key: string): Promise<void> {
  await prisma.siteSetting.deleteMany({ where: { key } });
}

// Câte cereri mai sunt permise în fereastra curentă (fără consum).
export async function bucketRemaining(
  key: string,
  windowMs: number,
  limit: number
): Promise<number> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (!row) return limit;
  const value = row.value as { count?: number; windowStart?: number } | null;
  if (!value?.windowStart) return limit;
  if (Date.now() - value.windowStart >= windowMs) return limit;
  return Math.max(0, limit - (value.count ?? 0));
}

// ── OTP ─────────────────────────────────────────────────────────
// Verificare cod (brute-force pe 6 cifre): max 5 încercări greșite per
// email+IP într-o fereastră de 15 minute.
const OTP_VERIFY_LIMIT = 5;
const OTP_VERIFY_WINDOW_MS = 15 * 60 * 1000;

export async function otpVerifyRateLimit(
  email: string,
  ip: string
): Promise<boolean> {
  return consumeBucket(
    `otp-failures:${email}:${ip}`,
    OTP_VERIFY_LIMIT,
    OTP_VERIFY_WINDOW_MS
  );
}

export async function otpVerifyRateLimitSuccess(
  email: string,
  ip: string
): Promise<void> {
  await clearBucket(`otp-failures:${email}:${ip}`);
}

// Trimitere cod (anti email-bombing): max 3 cereri per email în 10 minute.
const OTP_REQUEST_LIMIT = 3;
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;

export async function otpRequestRateLimit(email: string): Promise<boolean> {
  return consumeBucket(
    `otp-requests:${email}`,
    OTP_REQUEST_LIMIT,
    OTP_REQUEST_WINDOW_MS
  );
}

// ── Înregistrare (anti spambot pe IP) ───────────────────────────
const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_MS = 30 * 60 * 1000;

export async function registerRateLimit(ip: string): Promise<boolean> {
  return consumeBucket(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
}

// ── Formulare publice (feedback/contact) ────────────────────────
const FEEDBACK_LIMIT = 5;
const FEEDBACK_WINDOW_MS = 10 * 60 * 1000;

export async function feedbackRateLimit(ip: string): Promise<boolean> {
  return consumeBucket(`feedback:${ip}`, FEEDBACK_LIMIT, FEEDBACK_WINDOW_MS);
}

// ── Siera (chat AI per utilizator) ──────────────────────────────
const SIERA_LIMIT = 40;
const SIERA_WINDOW_MS = 6 * 60 * 60 * 1000;

function sieraKey(userId: string): string {
  return `siera-rate:${userId}`;
}

export async function checkRateLimit(userId: string): Promise<boolean> {
  return (await bucketRemaining(sieraKey(userId), SIERA_WINDOW_MS, SIERA_LIMIT)) > 0;
}

export async function consumeRateLimit(userId: string): Promise<void> {
  await consumeBucket(sieraKey(userId), SIERA_LIMIT, SIERA_WINDOW_MS);
}