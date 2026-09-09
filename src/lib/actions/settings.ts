"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, isAdmin } from "@/lib/access";
import { revalidateBacSchedule } from "@/lib/revalidate";

const SETTING_KEY = "bacSchedule";

const bacScheduleSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  startDate: z.string(),
  endDate: z.string(),
  nextSessionStartDate: z.string(),
  events: z
    .array(
      z.object({
        date: z.string(),
        title: z.string().min(1, "Titlul probei nu poate fi gol"),
      })
    )
    .max(20)
    .default([]),
});

export async function saveBacSchedule(
  input: z.input<typeof bacScheduleSchema>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await currentUser();
    if (!user || !isAdmin(user)) {
      return { ok: false, error: "Acces interzis" };
    }

    const data = bacScheduleSchema.parse(input);

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: data },
      create: { key: SETTING_KEY, value: data },
    });

    revalidateBacSchedule();
    return { ok: true };
  } catch (err) {
    console.error("saveBacSchedule failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Eroare la salvare",
    };
  }
}