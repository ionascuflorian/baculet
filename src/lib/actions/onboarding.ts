"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/access";

export async function acceptTerms(): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  await prisma.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: new Date() },
  });
  revalidatePath("/onboarding");
  return { ok: true };
}

export async function completeOnboarding(): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingDone: true },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}
