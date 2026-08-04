export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Termenul-limită pentru a păstra seria: dacă ultima activitate a fost în ziua D,
// trebuie să înveți din nou cel târziu în ziua D+1. Momentul exact de reset este
// începutul zilei D+2 (adică miezul nopții după D+1).
export function streakDeadline(lastActiveAt: Date | null): Date | null {
  if (!lastActiveAt) return null;
  return addDays(startOfDay(lastActiveAt), 2);
}

export function diffInDays(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

export interface StreakUpdate {
  streakCount: number;
  lastActiveAt: Date;
}

export function nextStreak(
  lastActiveAt: Date | null,
  streakCount: number,
  now: Date = new Date()
): StreakUpdate {
  if (!lastActiveAt) {
    return { streakCount: 1, lastActiveAt: now };
  }

  const delta = diffInDays(lastActiveAt, now);

  if (delta <= 0) {
    // Today (already counted) — keep the streak
    return { streakCount, lastActiveAt: now };
  }

  if (delta === 1) {
    // Yesterday — streak continues
    return { streakCount: streakCount + 1, lastActiveAt: now };
  }

  // Gap of 2+ days — reset
  return { streakCount: 1, lastActiveAt: now };
}
