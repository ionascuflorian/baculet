"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextStreak } from "@/lib/streak";

export async function toggleLessonComplete(lessonId: string, path: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Neautorizat");

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
  }

  revalidatePath(path);
  revalidatePath("/dashboard");
  revalidatePath("/progres");
}
