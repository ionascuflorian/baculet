"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type CalendarState = { error?: string; ok?: boolean };

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function toUtcDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export interface AddEventInput {
  title: string;
  date: string;
  color?: string | null;
}

export async function addCalendarEvent(
  input: AddEventInput
): Promise<CalendarState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Neautorizat" };

  const title = input.title?.trim();
  const date = toUtcDate(input.date);
  if (!title || title.length > 120) return { error: "Titlu invalid." };
  if (!date) return { error: "Dată invalidă." };
  if (input.color != null && !HEX_COLOR.test(input.color)) {
    return { error: "Culoare invalidă." };
  }

  try {
    await prisma.calendarEvent.create({
      data: {
        userId: session.user.id,
        title,
        date,
        color: input.color || null,
        kind: "USER",
      },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { error: "Nu am putut adăuga evenimentul." };
  }
}

export async function deleteCalendarEvent(id: string): Promise<CalendarState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Neautorizat" };

  try {
    await prisma.calendarEvent.deleteMany({
      where: { id, userId: session.user.id, kind: "USER" },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { error: "Nu am putut șterge evenimentul." };
  }
}
