const WINDOW_MS = 6 * 60 * 60 * 1000;
const LIMIT = 40;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || now >= b.resetAt) return true;
  return b.count < LIMIT;
}

export function consumeRateLimit(userId: string): void {
  const now = Date.now();
  const b = buckets.get(userId);
  if (!b || now >= b.resetAt) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  b.count += 1;
}
