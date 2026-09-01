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

  // gate: verifică pașii anteriori
  const prevSteps = await prisma.lessonStep.findMany({
    where: { lessonId, order: { lt: step.order } },
    select: { id: true },
  });
  if (prevSteps.length > 0) {
    const donePrev = await prisma.lessonStepProgress.findMany({
      where: { userId: session.user.id, stepId: { in: prevSteps.map((s) => s.id) } },
      select: { stepId: true },
    });
    if (donePrev.length !== prevSteps.length) {
      throw new Error("Parcurge pașii anteriori mai întâi");
    }
  }

  // Creare atomică: skipDuplicates evită duplicate pe cereri concurente.
  const created = await prisma.lessonStepProgress.createMany({
    data: [{ userId: session.user.id, stepId, lessonId }],
    skipDuplicates: true,
  });
  if (created.count === 0) return { already: true };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastActiveAt: true, streakCount: true },
  });
  if (user) {
    const streak = nextStreak(user.lastActiveAt, user.streakCount);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveAt: streak.lastActiveAt, streakCount: streak.streakCount },
    });
  }
  await recordStudyActivity(session.user.id);

  // mastery: actualizează conceptele lecției (soft, pe baza parcurgerii pasului)
  try {
    const concepts = await prisma.concept.findMany({ where: { lessonId }, select: { id: true, difficulty: true } });
    for (const c of concepts) {
      await updateConceptMastery(session.user.id, c.id, true, c.difficulty, { isReview: false });
    }
  } catch (err) {
    console.error("completeLessonStep: mastery update failed:", err);
  }

  // unit progress: marchează progresul unității care conține lecția
  try {
    const lessonWithUnit = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { unitId: true } });
    if (lessonWithUnit?.unitId) {
      const totalSteps = await prisma.lessonStep.count({ where: { lessonId } });
      const doneSteps = await prisma.lessonStepProgress.count({ where: { userId: session.user.id, lessonId } });
      const progress = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;
      const status = progress === 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "AVAILABLE";
      await prisma.userUnitProgress.upsert({
        where: { userId_unitId: { userId: session.user.id, unitId: lessonWithUnit.unitId } },
        update: { progress, status, completedAt: progress === 100 ? new Date() : null },
        create: { userId: session.user.id, unitId: lessonWithUnit.unitId, progress, status, completedAt: progress === 100 ? new Date() : null },
      });
    }
  } catch (err) {
    console.error("completeLessonStep: unit progress failed:", err);
  }

  // auto-complete lecția dacă toți pașii sunt gata
  const [total, done] = await Promise.all([
    prisma.lessonStep.count({ where: { lessonId } }),
    prisma.lessonStepProgress.count({ where: { userId: session.user.id, lessonId } }),
  ]);
  let lessonCompleted = false;
  if (total > 0 && done === total) {
    const created = await prisma.lessonProgress.createMany({
      data: [{ userId: session.user.id, lessonId }],
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
