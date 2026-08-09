"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/mail";
import { buildUsername, uniqueUsername } from "@/lib/username";

export type AuthState = { error?: string };

export async function logout() {
  await signOut({ redirectTo: "/" });
}

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  terms: z.literal("on"),
});

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });
  if (existing && !existing.emailVerified) {
    return {
      error:
        "Contul nu este activat încă. Folosește codul de pe email sau tab-ul „Cod pe email”.",
    };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email sau parolă incorecte." };
    }
    throw error;
  }
}

export async function register(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const terms = String(formData.get("terms") ?? "");

  const parsed = registerSchema.safeParse({ name, email, password, terms });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "terms")) {
      return { error: "Trebuie să accepți Termenii și Condițiile." };
    }
    return { error: "Verifică datele introduse (parolă minim 6 caractere)." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Există deja un cont cu acest email." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const { username: base } = buildUsername(parsed.data.name, parsed.data.email);
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      username: await uniqueUsername(base),
      passwordHash,
      termsAcceptedAt: new Date(),
    },
  });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.verificationToken.deleteMany({ where: { email } });
  await prisma.verificationToken.create({
    data: { email, token: code, expires: new Date(Date.now() + 10 * 60 * 1000) },
  });
  await sendOtpEmail(email, code);

  redirect(`/register/activare?email=${encodeURIComponent(email)}`);
}
