"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { ok: false, error: "Acces interzis" };
    }

    const data = bacScheduleSchema.parse(input);

    await prisma.siteSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: data },
      create: { key: SETTING_KEY, value: data },
    });

    revalidatePath("/admin/bac");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("saveBacSchedule failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Eroare la salvare",
    };
  }
}