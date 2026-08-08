import { prisma } from "@/lib/db";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "baculet",
  "siera",
  "support",
  "root",
  "sistem",
  "moderator",
  "bac",
  "examen",
  "help",
  "cont",
  "prieteni",
  "clasament",
  "materii",
  "dashboard",
  "progres",
]);

// „andrei popescu" → „andrei.popescu", „Andreea-Maria Ionescu" → „andreea.maria.ionescu"
export function slugifyName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/șş/g, "s")
    .replace(/țţ/g, "t")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
  return slug;
}

export function buildUsername(
  name: string,
  email: string
): { username: string; ok: boolean } {
  let base = slugifyName(name);
  if (base.length < 3) {
    const fromEmail = email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]+/g, ".");
    base = slugifyName(fromEmail.replace(/\./g, " "));
  }
  if (base.length < 3) base = base + "elev";
  base = base.slice(0, 20);
  return { username: base, ok: !RESERVED_USERNAMES.has(base) };
}

export async function uniqueUsername(
  base: string,
  userId?: string
): Promise<string> {
  const candidate = base || "elev";
  const existing = await prisma.user.findFirst({
    where: { username: candidate },
    select: { id: true },
  });
  if (!existing || (userId && existing.id === userId)) return candidate;
  for (let i = 1; i < 1000; i++) {
    const withNum = `${candidate}.${i}`.slice(0, 20);
    const taken = await prisma.user.findFirst({
      where: { username: withNum },
      select: { id: true },
    });
    if (!taken || (userId && taken.id === userId)) return withNum;
  }
  return `${candidate}.${Date.now() % 1000}`.slice(0, 20);
}

// Backfill pentru utilizatorii existenți fără username.
export async function backfillUsernames(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { username: null },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  let updated = 0;
  for (const u of users) {
    const { username: base } = buildUsername(u.name, u.email);
    const username = await uniqueUsername(base);
    try {
      await prisma.user.update({
        where: { id: u.id },
        data: { username },
      });
      updated++;
    } catch (err) {
      const isP2002 =
        err instanceof Error && err.message.includes("Unique constraint failed");
      if (isP2002) {
        const retry = await uniqueUsername(`${base}.x`);
        await prisma.user.update({
          where: { id: u.id },
          data: { username: retry },
        });
        updated++;
      } else {
        throw err;
      }
    }
  }
  return updated;
}
