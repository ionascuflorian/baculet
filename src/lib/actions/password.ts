"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { sendOtpEmail, showInAppCode } from "@/lib/mail";
import { otpRequestRateLimit, otpVerifyRateLimit } from "@/lib/otp-rate-limit";

export type ResetState = {
  error?: string;
  devCode?: string;
};

const emailSchema = z.string().email();

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: "Introdu o adresă de email validă." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Nu există niciun cont cu acest email." };

  if (!(await otpRequestRateLimit(email))) {
    return {
      error: "Prea multe cereri. Încearcă din nou în câteva minute.",
    };
  }

  await prisma.verificationToken.deleteMany({ where: { email } });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.verificationToken.create({
    data: { email, token: code, expires: new Date(Date.now() + 10 * 60 * 1000) },
  });

  await sendOtpEmail(email, code);

  return { error: "", devCode: showInAppCode() ? code : undefined };
}

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
  newPassword: z.string().min(8).max(100),
  confirm: z.string().min(8).max(100),
});

export async function resetPassword(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const parsed = resetSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    code: String(formData.get("code") ?? "").trim(),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: "Parola nouă trebuie să aibă minim 8 caractere.",
    };
  }

  const { email, code, newPassword } = parsed.data;
  if (newPassword !== parsed.data.confirm) {
    return { error: "Parolele nu coincid." };
  }

  if (!(await otpVerifyRateLimit(email, "reset"))) {
    return {
      error: "Prea multe încercări. Încearcă din nou în câteva minute.",
    };
  }

  // Consumă codul atomic: dacă nu există, e incorect sau a fost deja folosit.
  const deleted = await prisma.verificationToken.deleteMany({
    where: { email, token: code, expires: { gt: new Date() } },
  });
  if (deleted.count === 0) {
    return { error: "Cod incorect sau expirat." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Contul nu a fost găsit." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, emailVerified: new Date() },
  });

  try {
    await signIn("credentials", {
      email,
      password: newPassword,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Autentificarea a eșuat. Încearcă să te loghezi." };
    }
    throw error;
  }
}