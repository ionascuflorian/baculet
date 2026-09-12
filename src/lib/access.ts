import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { AdminPermission } from "@/generated/prisma/client";

export type UserRole = "ADMIN" | "USER";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  isOwner: boolean;
  permissions: AdminPermission[];
}

export const ADMIN_PERMISSIONS: AdminPermission[] = [
  "MANAGE_CONTENT",
  "MANAGE_QUIZZES",
  "MANAGE_EXAMS",
  "MANAGE_SITE_SETTINGS",
  "MANAGE_SITE_AI",
  "MANAGE_AI_CONTENT",
  "MANAGE_USERS",
];

// Singurul loc care citește sesiunea pentru autorizare. Return-ează
// utilizatorul normalizat sau null; nu programează modul de fail.
// Memoizat per-request (React cache): layout + pagini + acțiuni din aceeași
// cerere împart o singură citire de DB în loc de una fiecare.
// Autoritatea reală stă aici (apelurile server): permisiunile se verifică
// live din DB, nu dintr-un token înghețat la login.
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    name: u.name ?? null,
    role: u.role === "ADMIN" ? "ADMIN" : "USER",
    isOwner: u.isOwner === true,
    permissions: Array.isArray(u.permissions) ? (u.permissions as AdminPermission[]) : [],
  };
});

export function isAdmin(user: Pick<SessionUser, "role">): boolean {
  return user.role === "ADMIN";
}

// Owner-ul are toate permisiunile, indiferent de lista stocată.
export function hasPermission(
  user: Pick<SessionUser, "role" | "isOwner" | "permissions">,
  permission: AdminPermission
): boolean {
  if (user.role !== "ADMIN") return false;
  if (user.isOwner) return true;
  return user.permissions.includes(permission);
}

// Pentru server actions / API routes care preferă throw.
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("Neautorizat");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new Error("Acces interzis");
  return user;
}

export async function requirePermission(
  permission: AdminPermission
): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user, permission)) throw new Error("Acces interzis");
  return user;
}

// Pentru acțiunile de gestionare a adminilor (promovare/demovare/permisiuni).
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN" || !user.isOwner) throw new Error("Acces interzis");
  return user;
}

// Pentru paginile admin (server components): redirect la panou în loc de throw.
export async function requirePage(
  permission: AdminPermission
): Promise<SessionUser> {
  const user = await currentUser();
  if (!user || !hasPermission(user, permission)) {
    redirect("/admin");
  }
  return user;
}