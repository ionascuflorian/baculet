"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, requirePermission, requireUser } from "@/lib/access";
import { revalidateTheme } from "@/lib/revalidate";
import { THEME_COOKIE } from "@/lib/theme-constants";
import {
  defaultDarkPalette,
  defaultPalette,
} from "@/components/themes/palette";

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
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug invalid (doar litere mici, cifre și liniuțe)")
    .optional(),
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
    await requirePermission("MANAGE_SITE_SETTINGS");
    // Slug-ul gol/doar spații = absent → se auto-generează din nume.
    const data = themeSchema.parse({
      ...input,
      slug: input.slug?.trim() || undefined,
    });
    const slug = data.slug?.trim() || slugify(data.name) || "tema";

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
      // Compleți cheile lipsă din paletă cu default-urile ca nicio variabilă
      // de culoare să nu rămână nedefinită (ex. onAccent lipsă → text alb)
      light: { ...defaultPalette(), ...data.light },
      dark: { ...defaultDarkPalette(), ...data.dark },
    };

    const theme = id
      ? await prisma.theme.update({ where: { id }, data: payload })
      : await prisma.theme.create({ data: payload });

    revalidateTheme();
    return { id: theme.id };
  } catch (err) {
    console.error("saveTheme failed:", err);
    if (err instanceof z.ZodError) {
      return {
        error:
          err.issues[0]?.message ??
          "Date invalide. Verifică numele și culorile (format #rrggbb).",
      };
    }
    return { error: "Date invalide. Verifică numele și culorile (format #rrggbb)." };
  }
}

export async function deleteTheme(id: string) {
  await requirePermission("MANAGE_SITE_SETTINGS");
  await prisma.theme.delete({ where: { id } });
  revalidateTheme();
}

export async function setThemeEnabled(id: string, enabled: boolean) {
  await requirePermission("MANAGE_SITE_SETTINGS");
  await prisma.theme.update({ where: { id }, data: { enabled } });
  revalidateTheme();
}

export async function setUserTheme(slug: string | null) {
  const user = await requireUser();

  if (slug) {
    const theme = await prisma.theme.findUnique({ where: { slug } });
    if (!theme || !theme.enabled) throw new Error("Tema nu există");
  } else {
    slug = null;
  }

  await prisma.user.update({ where: { id: user.id }, data: { themeSlug: slug } });

  const cookieStore = await cookies();
  if (slug) {
    cookieStore.set(THEME_COOKIE, slug, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  } else {
    cookieStore.delete(THEME_COOKIE);
  }

  revalidatePath("/cont");
}

export async function syncUserThemeCookie(): Promise<string> {
  const cookieStore = await cookies();

  let slug = "default";
  try {
    const user = await currentUser();
    if (user) {
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { themeSlug: true },
      });
      slug = u?.themeSlug ?? "default";
    }
  } catch {
    slug = "default";
  }

  const cookieValue = cookieStore.get(THEME_COOKIE)?.value;
  if (cookieValue !== slug) {
    if (slug && slug !== "default") {
      cookieStore.set(THEME_COOKIE, slug, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else {
      cookieStore.delete(THEME_COOKIE);
    }
  }

  return slug;
}
