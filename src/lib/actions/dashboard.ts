"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/access";
import { normalizePrefs, type DashboardPrefs } from "@/lib/dashboard-widgets";
import type { Prisma } from "@/generated/prisma/client";

export type WidgetsState = { error?: string; ok?: boolean };

export async function saveDashboardWidgets(prefs: DashboardPrefs): Promise<WidgetsState> {
  const user = await currentUser();
  if (!user) return { error: "Neautorizat" };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        dashboardWidgets: normalizePrefs(prefs) as unknown as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { error: "Nu am putut salva preferințele." };
  }
}
