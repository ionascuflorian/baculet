"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { sendSupportEmail } from "@/lib/mail";
import { feedbackRateLimit } from "@/lib/otp-rate-limit";

export type HelpState = { error?: string; ok?: boolean };

const helpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  topic: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(5000),
});

export async function submitHelp(
  _prev: HelpState,
  formData: FormData
): Promise<HelpState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const topic = String(formData.get("topic") ?? "");
  const message = String(formData.get("message") ?? "");

  const parsed = helpSchema.safeParse({ name, email, topic, message });
  if (!parsed.success) {
    return { error: "Verifică datele introduse (mesaj de minim 10 caractere)." };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await feedbackRateLimit(ip))) {
    return {
      error: "Prea multe mesaje. Încearcă din nou în câteva minute.",
    };
  }

  await sendSupportEmail(parsed.data);
  return { ok: true };
}