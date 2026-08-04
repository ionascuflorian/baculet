"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Acces interzis");
  }
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Neautorizat");
  return session.user.id;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Culoare invalidă (folosește formatul #rrggbb)");

const paletteSchema = z.record(z.string(), hexColor);

const themeSchema = z.object({
  name: z.string().min(2, "Numele trebuie să aibă minim 2 caractere.").max(60),
  slug: z.string().optional(),
  description: z.string().optional().default(""),
  enabled: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
  light: paletteSchema,
  dark: paletteSchema,
});

export type ThemeSaveState = { id?: string; error?: string };

export async function saveTheme(
  id: string | null,
  input: z.input<typeof themeSchema>
): Promise<ThemeSaveState> {
  try {
    await requireAdmin();
    const data = themeSchema.parse(input);
    const slug = data.slug?.trim() || slugify(data.name);

    const existing = await prisma.theme.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      return { error: "Există deja o temă cu acest slug." };
    }

    const payload = {
      name: data.name,
      slug,
      description: data.description,
      enabled: data.enabled,
      order: data.order,
      light: data.light,
      dark: data.dark,
    };

    const theme = id
      ? await prisma.theme.update({ where: { id }, data: payload })
      : await prisma.theme.create({ data: payload });

    revalidatePath("/admin/teme");
    revalidatePath("/cont");
    return { id: theme.id };
  } catch (err) {
    console.error("saveTheme failed:", err);
    return { error: "Date invalide. Verifică numele și culorile (format #rrggbb)." };
  }
}

export async function deleteTheme(id: string) {
  await requireAdmin();
  await prisma.theme.delete({ where: { id } });
  revalidatePath("/admin/teme");
  revalidatePath("/cont");
}

export async function setThemeEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  await prisma.theme.update({ where: { id }, data: { enabled } });
  revalidatePath("/admin/teme");
  revalidatePath("/cont");
}

export async function setUserTheme(slug: string | null) {
  const userId = await requireUser();

  if (slug) {
    const theme = await prisma.theme.findUnique({ where: { slug } });
    if (!theme || !theme.enabled) throw new Error("Tema nu există");
  } else {
    slug = null;
  }

  await prisma.user.update({ where: { id: userId }, data: { themeSlug: slug } });
  revalidatePath("/cont");
}
