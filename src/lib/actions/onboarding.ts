"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function acceptTerms(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  await prisma.user.update({
    where: { id: session.user.id },
    data: { termsAcceptedAt: new Date() },
  });
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function completeOnboarding(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingDone: true },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}
