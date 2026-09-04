"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextStreak } from "@/lib/streak";
import { recordStudyActivity } from "@/lib/study-activity";
import { XP_PER_STEP } from "@/lib/xp";
import { updateConceptMastery } from "@/lib/mastery";

export async function toggleLessonComplete(lessonId: string, path: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  });
  if (!lesson) throw new Error("Lecția nu există");

  // Toggle atomic: șterge toate rândurile existente; dacă n-a existat niciunul,
  // creează unul nou. Evită duplicate pe cereri concurente.
  const deleted = await prisma.lessonProgress.deleteMany({
    where: { userId: session.user.id, lessonId },
  });

  if (deleted.count === 0) {
    try {
      await prisma.lessonProgress.create({
        data: { userId: session.user.id, lessonId },
      });

      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { lastActiveAt: true, streakCount: true },
      });
      if (user) {
        const streak = nextStreak(user.lastActiveAt, user.streakCount);
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            lastActiveAt: streak.lastActiveAt,
            streakCount: streak.streakCount,
          },
        });
      }

      await recordStudyActivity(session.user.id);
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
  }

  revalidatePath(path);
  revalidatePath("/dashboard");
  revalidatePath("/progres");
}

export async function completeLessonStep(
  stepId: string,
  lessonId: string,
  path: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");
  const step = await prisma.lessonStep.findUnique({
    where: { id: stepId },
    select: { id: true, lessonId: true, order: true },
  });
  if (!step || step.lessonId !== lessonId) throw new Error("Pas inexistent");

  await assertPrevStepsDone(session.user.id, step.order, lessonId);

  return markStepDone(session.user.id, step, path);
}

export async function markStepRead(
  stepId: string,
  lessonId: string,
  path: string,
  timeSpent: number
) {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");
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

  await assertPrevStepsDone(session.user.id, step.order, lessonId);

  return markStepDone(session.user.id, step, path);
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
  path: string
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

  // mastery: actualizează conceptele lecției (soft, pe baza parcurgerii pasului)
  try {
    const concepts = await prisma.concept.findMany({ where: { lessonId }, select: { id: true, difficulty: true } });
    for (const c of concepts) {
      await updateConceptMastery(userId, c.id, true, c.difficulty, { isReview: false });
    }
  } catch (err) {
    console.error("markStepDone: mastery update failed:", err);
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

  revalidatePath(path);
  revalidatePath("/dashboard");
  revalidatePath("/progres");
  revalidatePath("/materii");
  return { already: false, lessonCompleted, xp: XP_PER_STEP };
}

export async function uncompleteLessonStep(stepId: string, lessonId: string, path: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");
  const prog = await prisma.lessonStepProgress.findUnique({
    where: { userId_stepId: { userId: session.user.id, stepId } },
  });
  if (prog) await prisma.lessonStepProgress.delete({ where: { id: prog.id } });
  // la undo, scoatem și progresul lecției
  await prisma.lessonProgress.deleteMany({ where: { userId: session.user.id, lessonId } });
  revalidatePath(path);
  revalidatePath("/dashboard");
  revalidatePath("/progres");
}
