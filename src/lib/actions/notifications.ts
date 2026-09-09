"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/access";

const prefsSchema = z.object({
  emailNotifs: z.boolean().default(true),
  streakNotifs: z.boolean().default(true),
  followNotifs: z.boolean().default(true),
  reminderHour: z.number().int().min(0).max(23).nullable().default(null),
});

export type NotifPrefsSaveState = { ok?: boolean; error?: string };

export async function saveNotifPrefs(
  prev: NotifPrefsSaveState,
  formData: FormData
): Promise<NotifPrefsSaveState> {
  const user = await currentUser();
  if (!user) return { error: "Neautorizat" };

  const reminderRaw = formData.get("reminderHour");
  let reminderHour: number | null = null;
  if (typeof reminderRaw === "string" && reminderRaw.trim() !== "") {
    reminderHour = Number(reminderRaw);
  }

  const parsed = prefsSchema.safeParse({
    emailNotifs: formData.get("emailNotifs") === "on",
    streakNotifs: formData.get("streakNotifs") === "on",
    followNotifs: formData.get("followNotifs") === "on",
    reminderHour,
  });

  if (!parsed.success) return { error: "Date invalide." };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: parsed.data,
    });
  } catch (err) {
    console.error("saveNotifPrefs failed:", err);
    return { error: "Eroare la salvarea preferințelor." };
  }

  revalidatePath("/cont");
  return { ok: true };
}
