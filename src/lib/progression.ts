import { prisma } from "@/lib/db";

export const PASS_THRESHOLD = 0.6; // 60% ca să deblochezi următorul pas/capitol

export function isChapterLocked(
  chapterIndex: number,
  completedByChapter: Set<string>[],
  chapterLessons: { id: string }[][]
): boolean {
  if (chapterIndex === 0) return false;
  // capitolul anterior trebuie să fie 100% complet
  const prevDone = completedByChapter[chapterIndex - 1];
  const prevLessons = chapterLessons[chapterIndex - 1];
  if (!prevDone || !prevLessons) return true;
  return prevLessons.some((l) => !prevDone.has(l.id));
}

export function isLessonLocked(
  lessonIndex: number,
  prevLessonDone: boolean,
  prevQuizPassed: boolean | null
): boolean {
  if (lessonIndex === 0) return false;
  // lecția anterioară trebuie marcată parcurge + quiz trecut (dacă există)
  if (!prevLessonDone) return true;
  if (prevQuizPassed === false) return true;
  return false;
}

export async function getUserGateData(userId: string, subjectId: string) {
  const [chapters, progress, attempts] = await Promise.all([
    prisma.chapter.findMany({
      where: { subjectId },
      orderBy: { order: "asc" },
      include: {
        lessons: { orderBy: { order: "asc" }, select: { id: true, slug: true } },
        quizzes: { where: { published: true }, select: { id: true } },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { chapter: { subjectId } } },
      select: { lessonId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId },
      select: { quizId: true, score: true, maxScore: true },
    }),
  ]);
  const doneSet = new Set(progress.map((p) => p.lessonId));
  // best per quiz
  const best = new Map<string, number>();
  for (const a of attempts) {
    const pct = a.maxScore ? a.score / a.maxScore : 0;
    const cur = best.get(a.quizId) ?? -1;
    if (pct > cur) best.set(a.quizId, pct);
  }
  return { chapters, doneSet, best };
}

export function lessonQuizPassed(
  lessonId: string,
  steps: { quizId: string | null }[],
  chapterQuizzes: { id: string }[],
  best: Map<string, number>
): boolean | null {
  // verificăm quiz-urile legate de pașii lecției + quiz de capitol dacă e ultima lecție
  // pentru simplitate, considerăm lecția ca trecând dacă toate quiz-urile sale au >= threshold
  const quizIds = steps.map((s) => s.quizId).filter(Boolean) as string[];
  if (quizIds.length === 0) return null;
  for (const qid of quizIds) {
    const pct = best.get(qid);
    if (pct === undefined) return false; // neîncercat
    if (pct < PASS_THRESHOLD) return false;
  }
  return true;
}
