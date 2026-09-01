import { prisma } from "@/lib/db";

// Limită per utilizator pe fereastră, stocată în DB (Postgres) ca să fie
// partajată corect între instanțe (serverless) și fără memory leak.
// Incrementările concurente se serializează cu un advisory lock per cheie.
const WINDOW_MS = 6 * 60 * 60 * 1000;
const LIMIT = 40;

async function readBucket(key: string) {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  if (row) {
    return row.value as { count?: number; windowStart?: number } | null;
  }
  return null;
}

export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `siera-rate:${userId}`;
  const value = await readBucket(key);
  if (!value?.windowStart) return true;
  if (Date.now() - value.windowStart >= WINDOW_MS) return true;
  return (value.count ?? 0) < LIMIT;
}

export async function consumeRateLimit(userId: string): Promise<void> {
  const key = `siera-rate:${userId}`;
  const now = Date.now();

  await prisma.$transaction(async (tx) => {
    // Advisory lock per cheie: serializează citire-modificare-scriere.
    // Hashez cheia la un int64 stabil pentru lock.
    const hash = [...key].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${hash}::bigint)`;

    const value = await tx.siteSetting.findUnique({ where: { key } });
    const prev = value
      ? (value.value as { count?: number; windowStart?: number } | null)
      : null;
    const expired =
      !prev?.windowStart || now - prev.windowStart >= WINDOW_MS;

    const count = expired ? 1 : (prev.count ?? 0) + 1;
    const windowStart = expired ? now : prev.windowStart;
    const payload = { count, windowStart };

    await tx.siteSetting.upsert({
      where: { key },
      update: { value: payload as object },
      create: { key, value: payload as object },
    });
  });
}
