import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MODEL = process.env.SIERA_MODEL || "gemini-3.5-flash-lite";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const paletteSchema = z.object({
  background: hex,
  foreground: hex,
  card: hex,
  ink: hex,
  subtle: hex,
  feather: hex,
  accent: hex,
  accentDark: hex,
  onAccent: hex,
});

const themeSchema = z.object({
  light: paletteSchema,
  dark: paletteSchema,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Neautorizat" }), {
      status: 401,
    });
  }

  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt =
    typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : "";

  try {
    const { object } = await generateObject({
      model: google(MODEL),
      schema: themeSchema,
      system:
        "Ești un designer de interfețe pentru 'Baculet', o aplicație românească de învățat pentru Bacalaureat. " +
        "Generează două palete de culori CSS armonioase și accesibile — varianta 'light' și varianta 'dark' — " +
        "fiecare culoare în format hex #rrggbb. Cheile: background, foreground, card, ink (text principal), " +
        "subtle (text secundar), feather (contururi), accent (culoare accent), accentDark (accent întunecat), " +
        "onAccent (text pe accent). " +
        "Asigură un contrast bun, text lizibil pe fundal și culori plăcute ochiului, potrivite unei aplicații de studiu.",
      prompt: prompt
        ? `Generează o temă care respectă descrierea: "${prompt}".`
        : "Generează o temă echilibrată, modernă, cu nuanțe plăcute, potrivită pentru o aplicație de învățat.",
    });

    return Response.json({ light: object.light, dark: object.dark });
  } catch (error) {
    console.error("generate-theme error:", error);
    return new Response(
      JSON.stringify({
        error: "Eroare la generarea temei. Încearcă din nou.",
      }),
      { status: 500 }
    );
  }
}