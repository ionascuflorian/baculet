import { auth } from "@/lib/auth";

export type UserRole = "ADMIN" | "USER";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
}

// Singurul loc care citește sesiunea pentru autorizare. Return-ează
// utilizatorul normalizat sau null; nu programează modul de fail.
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    name: u.name ?? null,
    role: u.role === "ADMIN" ? "ADMIN" : "USER",
  };
}

export function isAdmin(user: Pick<SessionUser, "role">): boolean {
  return user.role === "ADMIN";
}

// Pentru server actions care preferă throw.
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