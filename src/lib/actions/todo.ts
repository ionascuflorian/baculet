"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type TodoState = { error?: string; ok?: boolean };

export async function addTodo(text: string): Promise<TodoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Neautorizat" };

  const trimmed = text?.trim();
  if (!trimmed || trimmed.length > 200) return { error: "Text invalid." };

  try {
    const last = await prisma.todoItem.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    await prisma.todoItem.create({
      data: {
        userId: session.user.id,
        text: trimmed,
        order: (last?.order ?? 0) + 1,
      },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { error: "Nu am putut adăuga sarcina." };
  }
}

export async function toggleTodo(id: string): Promise<TodoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Neautorizat" };

  try {
    const item = await prisma.todoItem.findUnique({ where: { id } });
    if (!item || item.userId !== session.user.id) return { error: "Nu există." };
    await prisma.todoItem.update({
      where: { id },
      data: { done: !item.done },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { error: "Nu am putut actualiza sarcina." };
  }
}

export async function deleteTodo(id: string): Promise<TodoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Neautorizat" };

  try {
    await prisma.todoItem.deleteMany({
      where: { id, userId: session.user.id },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { error: "Nu am putut șterge sarcina." };
  }
}
