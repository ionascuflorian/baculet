"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/access";
import { nextStreak } from "@/lib/streak";
import { recordStudyActivity } from "@/lib/study-activity";
import { XP_PER_STEP } from "@/lib/xp";
import { updateConceptMastery } from "@/lib/mastery";
import { recordReview } from "@/lib/spaced-repetition";
import { revalidateLearning } from "@/lib/revalidate";
import { checkAnswer, normalizeQuestion, parseUserAnswer } from "@/lib/lesson/exercise-schema";

/** Pragul de trecere al mini-testului (0–100). */
const MINI_TEST_PASS_PCT = 70;

export type LessonAnswerMode = "practice" | "minitest";

export async function toggleLessonComplete(lessonId: string, path: string) {
  const user = await requireUser();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  });
  if (!lesson) throw new Error("Lecția nu există");

  // Toggle atomic: șterge toate rândurile existente; dacă n-a existat niciunul,
  // creează unul nou. Evită duplicate pe cereri concurente.
  const deleted = await prisma.lessonProgress.deleteMany({
    where: { userId: user.id, lessonId },
  });

  if (deleted.count === 0) {
    try {
      await prisma.lessonProgress.create({
        data: { userId: user.id, lessonId },
      });

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { lastActiveAt: true, streakCount: true },
      });
      if (dbUser) {
        const streak = nextStreak(dbUser.lastActiveAt, dbUser.streakCount);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: streak.lastActiveAt,
            streakCount: streak.streakCount,
          },
        });
      }

      await recordStudyActivity(user.id);
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
  }

  revalidateLearning(path);
}

export async function completeLessonStep(
  stepId: string,
  lessonId: string,
  path: string,
  opts: { skipSoftMastery?: boolean } = {}
) {
  const user = await requireUser();
  const step = await prisma.lessonStep.findUnique({
    where: { id: stepId },
    select: { id: true, lessonId: true, order: true },
  });
  if (!step || step.lessonId !== lessonId) throw new Error("Pas inexistent");

  await assertPrevStepsDone(user.id, step.order, lessonId);

  return markStepDone(user.id, step, path, opts.skipSoftMastery ?? false);
}

export async function markStepRead(
  stepId: string,
  lessonId: string,
  path: string,
  timeSpent: number
) {
  const user = await requireUser();
  const step = await prisma.lessonStep.findUnique({
    where: { id: stepId },
    select: { id: true, lessonId: true, order: true, quizId: true, minReadTime: true },
  });
  if (!step || step.lessonId !== lessonId) throw new Error("Pas inexistent");

  // secțiunile de exercițiu nu se marchează citite, se rezolvă
  if (step.quizId) {
    throw new Error("Acesta este un exercițiu: rezolvă-l pentru a continua.");
  }
  if (timeSpent < step.minReadTime) {
    throw new Error(
      `Mai citește ${step.minReadTime - timeSpent} secunde pentru a continua.`
    );
  }

  await assertPrevStepsDone(user.id, step.order, lessonId);

  return markStepDone(user.id, step, path);
}

async function assertPrevStepsDone(
  userId: string,
  order: number,
  lessonId: string
) {
  // gate: verifică pașii anteriori
  const prevSteps = await prisma.lessonStep.findMany({
    where: { lessonId, order: { lt: order } },
    select: { id: true },
  });
  if (prevSteps.length > 0) {
    const donePrev = await prisma.lessonStepProgress.findMany({
      where: { userId, stepId: { in: prevSteps.map((s) => s.id) } },
      select: { stepId: true },
    });
    if (donePrev.length !== prevSteps.length) {
      throw new Error("Parcurge pașii anteriori mai întâi");
    }
  }
}

async function markStepDone(
  userId: string,
  step: { id: string; lessonId: string },
  path: string,
  skipSoftMastery = false
) {
  const lessonId = step.lessonId;

  // Creare atomică: skipDuplicates evită duplicate pe cereri concurente.
  const created = await prisma.lessonStepProgress.createMany({
    data: [{ userId, stepId: step.id, lessonId }],
    skipDuplicates: true,
  });
  if (created.count === 0) return { already: true };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveAt: true, streakCount: true },
  });
  if (user) {
    const streak = nextStreak(user.lastActiveAt, user.streakCount);
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: streak.lastActiveAt, streakCount: streak.streakCount },
    });
  }
  await recordStudyActivity(userId);

  // mastery soft (legacy): actualizează conceptele lecției pe parcurgerea pasului.
  // La pașii interactivi mastery-ul vine din răspunsurile reale per întrebare.
  if (!skipSoftMastery) {
    try {
      const concepts = await prisma.concept.findMany({ where: { lessonId }, select: { id: true, difficulty: true } });
      for (const c of concepts) {
        await updateConceptMastery(userId, c.id, true, c.difficulty, { isReview: false });
      }
    } catch (err) {
      console.error("markStepDone: mastery update failed:", err);
    }
  }

  // unit progress: marchează progresul unității care conține lecția
  try {
    const lessonWithUnit = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { unitId: true } });
    if (lessonWithUnit?.unitId) {
      const totalSteps = await prisma.lessonStep.count({ where: { lessonId } });
      const doneSteps = await prisma.lessonStepProgress.count({ where: { userId, lessonId } });
      const progress = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;
      const status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "AVAILABLE";
      await prisma.userUnitProgress.upsert({
        where: { userId_unitId: { userId, unitId: lessonWithUnit.unitId } },
        update: { progress, status, completedAt: progress === 100 ? new Date() : null },
        create: { userId, unitId: lessonWithUnit.unitId, progress, status, completedAt: progress === 100 ? new Date() : null },
      });
    }
  } catch (err) {
    console.error("markStepDone: unit progress failed:", err);
  }

  // auto-complete lecția dacă toți pașii sunt gata
  const [total, done] = await Promise.all([
    prisma.lessonStep.count({ where: { lessonId } }),
    prisma.lessonStepProgress.count({ where: { userId, lessonId } }),
  ]);
  let lessonCompleted = false;
  if (total > 0 && done === total) {
    const created = await prisma.lessonProgress.createMany({
      data: [{ userId, lessonId }],
      skipDuplicates: true,
    });
    if (created.count > 0) lessonCompleted = true;
  }

  revalidateLearning(path);
  return { already: false, lessonCompleted, xp: XP_PER_STEP };
}

export async function uncompleteLessonStep(stepId: string, lessonId: string, path: string) {
  const user = await requireUser();
  const prog = await prisma.lessonStepProgress.findUnique({
    where: { userId_stepId: { userId: user.id, stepId } },
  });
  if (prog) await prisma.lessonStepProgress.delete({ where: { id: prog.id } });
  // la undo, scoatem și progresul lecției
  await prisma.lessonProgress.deleteMany({ where: { userId: user.id, lessonId } });
  revalidateLearning(path);
}

const questionSelect = {
  id: true,
  text: true,
  options: true,
  correctIndex: true,
  answer: true,
  explanation: true,
  type: true,
  difficulty: true,
  concept: true,
  conceptId: true,
  conceptRef: { select: { name: true } },
  order: true,
} as const;

async function loadStepQuiz(stepId: string) {
  const step = await prisma.lessonStep.findUnique({
    where: { id: stepId },
    select: {
      id: true,
      lessonId: true,
      order: true,
      quiz: { select: { id: true, questions: { orderBy: { order: "asc" }, select: questionSelect } } },
    },
  });
  return step;
}

/**
 * Înregistrează un răspuns la un exercițiu interactiv: mastery real per întrebare
 * și spaced repetition. Apelat la fiecare verificare din player.
 */
export async function submitLessonAnswer(stepId: string, questionId: string, raw: unknown) {
  const user = await requireUser();
  const step = await loadStepQuiz(stepId);
  const question = step?.quiz?.questions.find((q) => q.id === questionId);
  if (!step || !question) throw new Error("Exercițiu inexistent");

  const exercise = normalizeQuestion({
    id: question.id,
    text: question.text,
    options: question.options,
    correctIndex: question.correctIndex,
    answer: question.answer,
    explanation: question.explanation,
    type: question.type,
    difficulty: question.difficulty,
    concept: question.conceptRef?.name ?? question.concept ?? null,
    conceptId: question.conceptId,
  });
  const userAnswer = parseUserAnswer(exercise.kind, raw);
  const correct = userAnswer ? checkAnswer(exercise, userAnswer) : false;

  if (question.conceptId) {
    await updateConceptMastery(user.id, question.conceptId, correct, exercise.difficulty ?? 1, {});
  }
  await recordReview(user.id, question.id, correct);

  return { correct };
}

/**
 * Închide un pas cu quiz interactiv: re-verifică răspunsurile finale pe server
 * (autoritativ), aplică politica de completare (practice: toate corecte;
 * minitest: prag minim) și marchează pasul/lecția fără mastery soft.
 */
export async function completeLessonAnswers(
  stepId: string,
  lessonId: string,
  path: string,
  answers: Record<string, unknown>,
  mode: LessonAnswerMode
) {
  const user = await requireUser();
  const step = await loadStepQuiz(stepId);
  if (!step || step.lessonId !== lessonId) throw new Error("Pas inexistent");

  const questions = step.quiz?.questions ?? [];
  if (questions.length === 0) {
    await assertPrevStepsDone(user.id, step.order, lessonId);
    const res = await markStepDone(user.id, step, path, true);
    return { completed: true, pct: 100, weak: [], already: res.already ?? false };
  }

  const results = questions.map((q) => {
    const exercise = normalizeQuestion({
      id: q.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      answer: q.answer,
      explanation: q.explanation,
      type: q.type,
      difficulty: q.difficulty,
      concept: q.conceptRef?.name ?? q.concept ?? null,
      conceptId: q.conceptId,
    });
    const userAnswer = parseUserAnswer(exercise.kind, answers[q.id]);
    return {
      questionId: q.id,
      correct: userAnswer ? checkAnswer(exercise, userAnswer) : false,
      conceptId: q.conceptId,
      concept: q.conceptRef?.name ?? q.concept ?? null,
    };
  });

  const pct = Math.round((results.filter((r) => r.correct).length / questions.length) * 100);
  const completed = mode === "practice" ? results.every((r) => r.correct) : pct >= MINI_TEST_PASS_PCT;
  const weak = results.filter((r) => !r.correct).map((r) => ({
    questionId: r.questionId,
    conceptId: r.conceptId,
    concept: r.concept,
  }));

  if (!completed) {
    return { completed: false as const, pct, weak };
  }

  await assertPrevStepsDone(user.id, step.order, lessonId);
  const res = await markStepDone(user.id, step, path, true);
  return { completed: true as const, pct, weak, already: res.already ?? false };
}
