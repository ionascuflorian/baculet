const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "Baculet <onboarding@resend.dev>";

export async function sendOtpEmail(email: string, code: string) {
  if (RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: email,
          subject: "Codul tău de conectare Baculet",
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f4f7f4;border-radius:24px">
              <h1 style="color:#3c3c3c;margin:0 0 8px">Bun venit la Baculet! 🎉</h1>
              <p style="color:#3c3c3c;font-size:15px">Codul tău de conectare este:</p>
              <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#58cc02;background:#ffffff;padding:16px;text-align:center;border-radius:16px;margin:16px 0">${code}</div>
              <p style="color:#777777;font-size:13px">Codul expiră în 10 minute. Dacă nu ai cerut tu acest cod, poți ignora acest email.</p>
            </div>
          `,
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend error ${res.status}`);
      }
      return;
    } catch (error) {
      console.error("Eroare la trimiterea emailului:", error);
      // fallthrough to console fallback so dev still works
    }
  }
  // Dev fallback: printează codul în consolă
  console.log(`\n[📧 Baculet OTP] Cod pentru ${email}: ${code}\n`);
}

export function isMailConfigured() {
  return Boolean(RESEND_API_KEY);
}

// Cât timp nu există un furnizor de email configurat, afișăm codul direct
// în aplicație, ca să poți folosi toate fluxurile (activare, logare, reset).
export function showInAppCode() {
  return !isMailConfigured();
}

export async function sendSupportEmail(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}) {
  if (RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: MAIL_FROM,
          to: process.env.SUPPORT_EMAIL || "support@baculet.ro",
          replyTo: input.email,
          subject: `Ajutor: ${input.topic} (${input.email})`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f4f7f4;border-radius:24px">
              <h1 style="color:#3c3c3c;margin:0 0 12px">Cerere de ajutor</h1>
              <p style="color:#777777;font-size:13px;margin:0 0 16px">Trimisă din pagina de Ajutor Baculet.</p>
              <div style="background:#ffffff;padding:16px;borderradius:16px;font-size:14px;color:#3c3c3c">
                <p><strong>Nume:</strong> ${escapeHtml(input.name)}</p>
                <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
                <p><strong>Subiect:</strong> ${escapeHtml(input.topic)}</p>
                <p style="white-space:pre-wrap;margin-top:12px">${escapeHtml(input.message)}</p>
              </div>
            </div>
          `,
        }),
      });
      if (!res.ok) throw new Error(`Resend error ${res.status}`);
      return;
    } catch (error) {
      console.error("Eroare la trimiterea emailului de suport:", error);
    }
  }
  // Dev/fallback
  console.log(
    `\n[📬 Baculet Ajutor]\nDe la: ${input.name} <${input.email}>\nSubiect: ${input.topic}\n${input.message}\n`
  );
}

function escapeHtml(value: string) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}
