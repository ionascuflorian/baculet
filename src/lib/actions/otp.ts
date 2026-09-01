"use server";

import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { sendOtpEmail, showInAppCode } from "@/lib/mail";
import { otpRequestRateLimit } from "@/lib/otp-rate-limit";
import { generateOtpCode } from "@/lib/utils";

export type OtpState = { error?: string; email?: string; devCode?: string };

export async function requestCode(
  _prev: OtpState,
  formData: FormData
): Promise<OtpState> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Introdu o adresă de email validă." };
  }

  if (!(await otpRequestRateLimit(email))) {
    return {
      error: "Prea multe cereri. Încearcă din nou în câteva minute.",
    };
  }

  // Șterge codurile vechi pentru acest email
  await prisma.verificationToken.deleteMany({ where: { email } });

  const code = generateOtpCode();
  await prisma.verificationToken.create({
    data: { email, token: code, expires: new Date(Date.now() + 10 * 60 * 1000) },
  });

  await sendOtpEmail(email, code);

  return { error: "", email, devCode: showInAppCode() ? code : undefined };
}

export async function verifyCode(
  _prev: OtpState,
  formData: FormData
): Promise<OtpState> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const code = String(formData.get("code") ?? "").trim();

  try {
    await signIn("otp", { email, code, redirectTo: "/dashboard" });
    return { error: "" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cod incorect sau expirat. Încearcă din nou." };
    }
    throw error;
  }
}

export async function getDevCode(email: string): Promise<{ code: string | null }> {
  const clean = String(email ?? "").toLowerCase().trim();
  if (!showInAppCode() || !clean) return { code: null };
  const token = await prisma.verificationToken.findFirst({
    where: { email: clean },
    orderBy: { createdAt: "desc" },
  });
  if (!token || token.expires < new Date()) return { code: null };
  return { code: token.token };
}
