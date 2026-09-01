import { prisma } from "@/lib/db";

export const SR_DEFAULT_EASE = 2.5;
export const SR_MIN_EASE = 1.3;

function nextInterval(interval: number, ease: number, correct: boolean): number {
  if (!correct) return 1;
  return Math.max(1, Math.round(interval * ease));
}

export async function recordReview(
  userId: string,
  questionId: string,
  correct: boolean
) {
  const existing = await prisma.reviewItem.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });

  if (correct) {
    if (!existing) return; // nu creăm review pentru răspuns corect din prima
    const newEase = Math.max(SR_MIN_EASE, existing.ease + 0.1);
    const interval = nextInterval(existing.interval, newEase, true);
    await prisma.reviewItem.update({
      where: { id: existing.id },
      data: {
        successCount: { increment: 1 },
        ease: newEase,
        interval,
        nextReviewAt: new Date(Date.now() + interval * 86400000),
      },
    });
    // dacă a ajuns la 2 succese consecutive, îl putem considera învățat și șterge
    if (existing.successCount + 1 >= 2) {
      await prisma.reviewItem.delete({ where: { id: existing.id } });
    }
  } else {
    if (existing) {
      const newEase = Math.max(SR_MIN_EASE, existing.ease - 0.2);
      await prisma.reviewItem.update({
        where: { id: existing.id },
        data: {
          failCount: { increment: 1 },
          successCount: 0,
          ease: newEase,
          interval: 1,
          nextReviewAt: new Date(),
          lastFailedAt: new Date(),
        },
      });
    } else {
      await prisma.reviewItem.create({
        data: {
          userId,
          questionId,
          failCount: 1,
          successCount: 0,
          ease: SR_DEFAULT_EASE,
          interval: 1,
          nextReviewAt: new Date(),
          lastFailedAt: new Date(),
        },
      });
    }
  }
}

export async function getDueReviews(userId: string, limit = 20) {
  return prisma.reviewItem.findMany({
    where: { userId, nextReviewAt: { lte: new Date() } },
    orderBy: [{ failCount: "desc" }, { nextReviewAt: "asc" }],
    take: limit,
    include: {
      question: {
        select: {
          id: true,
          text: true,
          options: true,
          correctIndex: true,
          explanation: true,
          concept: true,
          quizId: true,
          quiz: { select: { title: true, slug: true, subject: { select: { name: true, slug: true } } } },
        },
      },
    },
  });
}

export async function getWeakConcepts(userId: string, limit = 6) {
  const items = await prisma.reviewItem.findMany({
    where: { userId },
    include: {
      question: { select: { id: true, concept: true, text: true, quiz: { select: { subject: { select: { name: true } } } } } },
    },
    orderBy: { failCount: "desc" },
    take: 50,
  });
  // grupează per concept
  const byConcept = new Map<string, { concept: string; failCount: number; examples: typeof items }>();
  for (const it of items) {
    const key = it.question.concept?.trim() || it.question.text.slice(0, 30);
    const cur = byConcept.get(key);
    if (cur) {
      cur.failCount += it.failCount;
      cur.examples.push(it);
    } else {
      byConcept.set(key, { concept: key, failCount: it.failCount, examples: [it] });
    }
  }
  const sorted = [...byConcept.values()].sort((a, b) => b.failCount - a.failCount).slice(0, limit);
  // mapăm la formatul așteptat de UI: păstrăm compatibilitate cu { _sum, question }
  return sorted.map((g) => ({
    questionId: g.examples[0].question.id,
    _count: { questionId: g.examples.length } as unknown as { questionId: number },
    _sum: { failCount: g.failCount } as unknown as { failCount: number | null },
    question: g.examples[0].question as unknown as { id: string; concept: string | null; text: string; quiz: { subject: { name: string } } },
    concept: g.concept,
  }));
}

export async function getRecapQuizData(userId: string) {
  const due = await getDueReviews(userId, 10);
  if (due.length === 0) return null;
  // grupează după concept sau ia întrebările direct
  const questions = due.map((r) => r.question);
  // dedup
  const uniq = Array.from(new Map(questions.map((q) => [q.id, q])).values());
  return uniq;
}
