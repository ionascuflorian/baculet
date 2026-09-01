"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextStreak } from "@/lib/streak";
import { recordStudyActivity } from "@/lib/study-activity";
import { XP_PER_STEP } from "@/lib/xp";

export async function toggleLessonComplete(lessonId: string, path: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  });
  if (!lesson) throw new Error("Lecția nu există");

  const existing = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonId: { userId: session.user.id, lessonId },
    },
  });

  if (existing) {
    await prisma.lessonProgress.delete({ where: { id: existing.id } });
  } else {
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

  const existing = await prisma.lessonStepProgress.findUnique({
    where: { userId_stepId: { userId: session.user.id, stepId } },
  });
  if (existing) return { already: true };

  await prisma.lessonStepProgress.create({
    data: { userId: session.user.id, stepId, lessonId },
  });

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

  // auto-complete lecția dacă toți pașii sunt gata
  const [total, done] = await Promise.all([
    prisma.lessonStep.count({ where: { lessonId } }),
    prisma.lessonStepProgress.count({ where: { userId: session.user.id, lessonId } }),
  ]);
  let lessonCompleted = false;
  if (total > 0 && done === total) {
    const lp = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
    });
    if (!lp) {
      await prisma.lessonProgress.create({ data: { userId: session.user.id, lessonId } });
      lessonCompleted = true;
    }
  }

  revalidatePath(path);
  revalidatePath("/dashboard");
  revalidatePath("/progres");
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
