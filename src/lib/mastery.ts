import { prisma } from "@/lib/db";

export type MasteryLevel = "UNKNOWN" | "LEARNING" | "ALMOST" | "MASTERED" | "EXCELLENT";

export function masteryLevel(mastery: number): MasteryLevel {
  if (mastery < 30) return "UNKNOWN";
  if (mastery < 60) return "LEARNING";
  if (mastery < 80) return "ALMOST";
  if (mastery < 95) return "MASTERED";
  return "EXCELLENT";
}

export function masteryLabel(level: MasteryLevel): string {
  switch (level) {
    case "UNKNOWN": return "Necunoscut";
    case "LEARNING": return "În învățare";
    case "ALMOST": return "Aproape";
    case "MASTERED": return "Stăpânit";
    case "EXCELLENT": return "Foarte bun";
  }
}

/**
 * Calculează mastery incremental.
 * - răspuns corect: + 5 + difficulty*2 (cu decay dacă deja mare)
 * - răspuns greșit: -8 - difficulty
 * - recap corect: bonus +3
 * - checkpoint: bonus ponderat
 * Se ține în 0-100.
 */
export function nextMastery(
  current: number,
  correct: boolean,
  difficulty: number,
  isReview = false,
  isCheckpoint = false
): number {
  let delta: number;
  if (correct) {
    const base = 6 + difficulty * 2;
    // diminishing returns când e aproape de 100
    const factor = current > 80 ? 0.5 : current > 60 ? 0.7 : 1;
    delta = Math.round(base * factor);
    if (isReview) delta += 2;
    if (isCheckpoint) delta += 3;
  } else {
    delta = -(8 + difficulty);
    // greșeli repetate penalizează mai tare când mastery mic?
    if (current < 30) delta -= 2;
  }
  const next = current + delta;
  return Math.max(0, Math.min(100, next));
}

export async function updateConceptMastery(
  userId: string,
  conceptId: string,
  correct: boolean,
  difficulty = 1,
  opts: { isReview?: boolean; isCheckpoint?: boolean } = {}
) {
  const existing = await prisma.userConceptProgress.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
  });
  const current = existing?.mastery ?? 0;
  const next = nextMastery(current, correct, difficulty, opts.isReview, opts.isCheckpoint);
  const attempts = (existing?.attempts ?? 0) + 1;
  const correctAttempts = (existing?.correctAttempts ?? 0) + (correct ? 1 : 0);
  const wrongAttempts = (existing?.wrongAttempts ?? 0) + (correct ? 0 : 1);
  const now = new Date();
  // nextReview: dacă greșit → 1 zi, dacă corect și mastery <80 → 3 zile, altfel 7 zile
  let nextReview: Date | null = null;
  if (!correct) nextReview = new Date(Date.now() + 24 * 3600 * 1000);
  else if (next < 80) nextReview = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  else nextReview = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const progress = await prisma.userConceptProgress.upsert({
    where: { userId_conceptId: { userId, conceptId } },
    update: {
      mastery: next,
      attempts,
      correctAttempts,
      wrongAttempts,
      lastPracticed: now,
      nextReview,
    },
    create: {
      userId,
      conceptId,
      mastery: next,
      attempts: 1,
      correctAttempts: correct ? 1 : 0,
      wrongAttempts: correct ? 0 : 1,
      lastPracticed: now,
      nextReview,
    },
  });
  return progress;
}

export async function getUserMasteryMap(userId: string) {
  const all = await prisma.userConceptProgress.findMany({ where: { userId } });
  return new Map(all.map((p) => [p.conceptId, p]));
}

export async function getConceptsForLesson(lessonId: string) {
  return prisma.concept.findMany({ where: { lessonId }, orderBy: { order: "asc" } });
}
export async function getConceptsForUnit(unitId: string) {
  return prisma.concept.findMany({ where: { unitId }, orderBy: { order: "asc" } });
}
