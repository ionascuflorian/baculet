"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateConceptMastery } from "@/lib/mastery";
import { revalidatePath } from "next/cache";

export interface CheckpointQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  conceptId?: string | null;
  conceptSlug?: string | null;
}

export async function submitCheckpoint(
  checkpointSlug: string,
  answers: Record<string, number>
): Promise<{
  attemptId: string;
  score: number;
  maxScore: number;
  pct: number;
  weakConcepts: { conceptId: string; name: string }[];
  masteryUpdates: { conceptId: string; mastery: number }[];
}> {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");
  const userId = session.user.id;

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { slug: checkpointSlug },
    include: {
      chapter: { select: { id: true } },
      unit: { select: { id: true, chapterId: true } },
    },
  });
  if (!checkpoint) throw new Error("Checkpoint inexistent");

  // ia întrebările checkpoint-ului (din quiz-uri legate de capitol/unit sau din conceptele capitolului)
  // Pentru demo, luăm 10 întrebări din baza existentă, distribuite pe concepte
  const chapterId = checkpoint.chapterId ?? checkpoint.unit?.chapterId;
  let questions: CheckpointQuestion[] = [];
  if (chapterId) {
    const qs = await prisma.question.findMany({
      where: { quiz: { chapterId } },
      orderBy: { order: "asc" },
      take: 10,
      select: { id: true, text: true, options: true, correctIndex: true, explanation: true, conceptId: true, concept: true, conceptRef: { select: { id: true, name: true, slug: true } } },
    });
    questions = qs.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options as string[],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      conceptId: q.conceptId ?? q.conceptRef?.id ?? null,
      conceptSlug: q.conceptRef?.slug ?? q.concept ?? null,
    }));
  }
  if (questions.length < 5) {
    const more = await prisma.question.findMany({
      where: { quiz: { subject: { chapters: { some: { id: chapterId } } } } },
      take: 10 - questions.length,
      orderBy: { order: "asc" },
      select: { id: true, text: true, options: true, correctIndex: true, explanation: true, conceptId: true, concept: true, conceptRef: { select: { id: true, name: true, slug: true } } },
    });
    questions = [
      ...questions,
      ...more.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options as string[],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        conceptId: q.conceptId ?? q.conceptRef?.id ?? null,
        conceptSlug: q.conceptRef?.slug ?? q.concept ?? null,
      })),
    ];
  }
  if (questions.length === 0) throw new Error("Nu există exerciții pentru acest checkpoint");

  const score = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const maxScore = questions.length;
  const pct = Math.round((score / maxScore) * 100);

  const attempt = await prisma.checkpointAttempt.create({
    data: {
      userId,
      checkpointId: checkpoint.id,
      score,
      maxScore,
      answers,
    },
  });

  // actualizează mastery per concept + UserUnitProgress
  const byConcept = new Map<string, { correct: number; total: number; name: string; id: string | null; slug: string }>();
  const masteryUpdates: { conceptId: string; mastery: number }[] = [];
  for (const q of questions) {
    const correct = answers[q.id] === q.correctIndex;
    const key = q.conceptId ?? q.conceptSlug ?? "general";
    const cur = byConcept.get(key) ?? { correct: 0, total: 0, name: q.conceptSlug ?? "Concept", id: q.conceptId ?? null, slug: q.conceptSlug ?? "general" };
    cur.total += 1;
    if (correct) cur.correct += 1;
    // păstrează id dacă există
    if (!cur.id && q.conceptId) cur.id = q.conceptId;
    byConcept.set(key, cur);
  }

  const weakConcepts: { conceptId: string; name: string }[] = [];
  for (const [key, data] of byConcept.entries()) {
    const isWeak = data.correct < data.total;
    // rezolvă conceptId din slug dacă nu avem id
    let cid: string | null = data.id;
    if (!cid && data.slug !== "general") {
      const c = await prisma.concept.findFirst({ where: { slug: data.slug } });
      if (c) cid = c.id;
    }
    if (isWeak && cid) weakConcepts.push({ conceptId: cid, name: data.name });
    else if (isWeak) weakConcepts.push({ conceptId: key, name: data.name });
    if (cid) {
      const allCorrectForConcept = data.correct === data.total;
      try {
        const prog = await updateConceptMastery(userId, cid, allCorrectForConcept, 2, { isCheckpoint: true });
        masteryUpdates.push({ conceptId: cid, mastery: prog.mastery });
      } catch {}
    }
  }

  // marchează unitatea checkpoint ca progres
  if (checkpoint.unitId) {
    try {
      const status = pct >= 70 ? "COMPLETED" : "NEEDS_REVIEW";
      await prisma.userUnitProgress.upsert({
        where: { userId_unitId: { userId, unitId: checkpoint.unitId } },
        update: { progress: 100, status, score: pct, completedAt: new Date() },
        create: { userId, unitId: checkpoint.unitId, progress: 100, status, score: pct, completedAt: new Date() },
      });
    } catch {}
  }

  // deblochează următoarea unitate (nu blocăm agresiv) — următoarea unitate devine AVAILABLE indiferent
  // statusul checkpoint-ului rămâne vizibil, dar next unit e deja AVAILABLE via learning-path logic

  revalidatePath(`/checkpoint/${checkpointSlug}`);
  revalidatePath("/materii");
  revalidatePath("/dashboard");
  revalidatePath("/progres");

  return { attemptId: attempt.id, score, maxScore, pct, weakConcepts, masteryUpdates };
}
