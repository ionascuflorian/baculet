"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { sendSupportEmail } from "@/lib/mail";
import { feedbackRateLimit } from "@/lib/otp-rate-limit";

export type FeedbackState = { error?: string; ok?: boolean };

const feedbackSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  type: z.enum(["BUG", "IDEA", "OTHER"]),
  message: z.string().trim().min(10).max(5000),
});

const TYPE_LABELS = {
  BUG: "Bug sau problemă",
  IDEA: "Idee de îmbunătățire",
  OTHER: "Altceva",
} as const;

export async function submitFeedback(
  _prev: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const type = String(formData.get("type") ?? "");
  const message = String(formData.get("message") ?? "");

  const parsed = feedbackSchema.safeParse({ name, email, type, message });
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

  await sendSupportEmail({
    name: parsed.data.name,
    email: parsed.data.email,
    topic: `[Feedback] ${TYPE_LABELS[parsed.data.type]}`,
    message: parsed.data.message,
  });

  return { ok: true };
}
