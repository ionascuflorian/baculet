// Trimitere emailuri prin EmailJS (temporar, cât construim site-ul).
// Se folosește REST API-ul EmailJS din server (Vercel): cheile stau în variabile
// de mediu, nu în cod. Cât timp variabilele nu sunt setate, codul (OTP) se
// afișează în aplicație + se printează în consolă (fallback de dezvoltare).

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
const EMAILJS_OTP_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_SUPPORT_TEMPLATE_ID = process.env.EMAILJS_SUPPORT_TEMPLATE_ID;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@baculet.ro";

function emailjsConfigured() {
  return Boolean(
    EMAILJS_SERVICE_ID &&
      EMAILJS_PUBLIC_KEY &&
      EMAILJS_OTP_TEMPLATE_ID &&
      EMAILJS_SUPPORT_TEMPLATE_ID
  );
}

export function isMailConfigured() {
  return emailjsConfigured();
}

// Cât timp EmailJS nu e configurat, afișăm codul direct în aplicație.
export function showInAppCode() {
  return !emailjsConfigured();
}

async function sendEmailJs(templateId: string | undefined, params: Record<string, unknown>) {
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: EMAILJS_PUBLIC_KEY,
      ...(EMAILJS_PRIVATE_KEY ? { accessToken: EMAILJS_PRIVATE_KEY } : {}),
      template_params: params,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`EmailJS error ${res.status}: ${text}`);
  }
}

export async function sendOtpEmail(email: string, code: string) {
  if (!emailjsConfigured()) {
    console.log(`\n[📧 Baculet OTP] Cod pentru ${email}: ${code}\n`);
    return;
  }
  try {
    await sendEmailJs(EMAILJS_OTP_TEMPLATE_ID, {
      to_email: email,
      from_name: "Baculet",
      code,
    });
  } catch (error) {
    console.error("Eroare la trimiterea emailului EmailJS:", error);
  }
}

export async function sendSupportEmail(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  if (!emailjsConfigured()) {
    console.log(
      `\n[📬 Baculet Ajutor]\nDe la: ${input.name} <${input.email}>\nSubiect: ${input.topic}\n${input.message}\n`
    );
    return;
  }
  try {
    await sendEmailJs(EMAILJS_SUPPORT_TEMPLATE_ID, {
      to_email: SUPPORT_EMAIL,
      reply_to: input.email,
      from_name: input.name,
      name: input.name,
      email: input.email,
      topic: input.topic,
      message: input.message,
    });
  } catch (error) {
    console.error("Eroare la trimiterea emailului de suport EmailJS:", error);
  }
}