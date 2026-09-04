import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptApiKey } from "@/lib/ai-keys";

export const dynamic = "force-dynamic";

const questionSchema = z.object({
  text: z.string().min(2),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional().default(""),
  type: z.enum(["SINGLE", "CLOZE", "FLASHCARD", "DRAG_DROP"]).default("SINGLE"),
});

const exercisesSchema = z.object({
  questions: z.array(questionSchema).min(1),
});

type ProviderName = "google" | "openai" | "anthropic";

function getModel(provider: ProviderName, apiKey: string) {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })("gpt-4o-mini");
    case "anthropic":
      return createAnthropic({ apiKey })("claude-3-5-haiku-latest");
    case "google":
    default:
      return createGoogleGenerativeAI({ apiKey })(
        process.env.SIERA_MODEL || "gemini-3.5-flash-lite"
      );
  }
}

const TYPE_LABELS: Record<string, string> = {
  SINGLE: "cu alegere (grilă)",
  CLOZE: "completare (gap)",
  FLASHCARD: "flashcard",
  DRAG_DROP: "ordonează / potrivește",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiProvider: true, aiApiKeyEnc: true },
  });

  const provider = (user?.aiProvider as ProviderName) || "google";
  let apiKey: string | null = null;
  if (user?.aiApiKeyEnc) {
    try {
      apiKey = decryptApiKey(user.aiApiKeyEnc);
    } catch {
      apiKey = null;
    }
  }
  if (!apiKey && provider !== "google") {
    return new Response(
      JSON.stringify({ error: "Configurează o cheie AI în Setări AI (panou admin)." }),
      { status: 400 }
    );
  }
  if (!apiKey) apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";

  const body = (await req.json().catch(() => ({}))) as {
    lessonTitle?: string;
    content?: string;
    subjectName?: string;
    count?: number;
    difficulty?: number;
    types?: string[];
  };

  const lessonTitle = typeof body.lessonTitle === "string" ? body.lessonTitle : "";
  const content = typeof body.content === "string" ? body.content : "";
  const subjectName = typeof body.subjectName === "string" ? body.subjectName : "materia";
  if (!content.trim()) {
    return new Response(JSON.stringify({ error: "Lecția nu are conținut de generat pe baza." }), {
      status: 400,
    });
  }

  const count = Math.min(10, Math.max(3, Math.round(body.count ?? 5)));
  const difficulty = Math.min(3, Math.max(1, Math.round(body.difficulty ?? 2)));
  const types = (Array.isArray(body.types) ? body.types : []).filter((t) =>
    ["SINGLE", "CLOZE", "FLASHCARD", "DRAG_DROP"].includes(t)
  );
  const typeClause = types.length
    ? `Tipuri permise: ${types.map((t) => TYPE_LABELS[t] ?? t).join(", ")}. Răspândește întrebările pe aceste tipuri.`
    : "Variantează tipurile: grilă, completare, flashcard, ordonare.";

  try {
    const { object } = await generateObject({
      model: getModel(provider, apiKey),
      schema: exercisesSchema,
      system:
        "Ești un profesor român de bacalaureat. Creezi exerciții de fixare pentru lecțiile de la școală. " +
        "Întrebările trebuie să fie în limba română, corecte din punct de vedere științific, adaptate nivelului elevului. " +
        "Pentru fiecare întrebare: 'text' = enunțul; 'options' = 4 variante de răspuns; 'correctIndex' = indexul variantei corecte; " +
        "'explanation' = o explicație scurtă de ce e corect; 'type' = tipul întrebării. " +
        "Pentru CLOZE, scrie enunțul cu spațiu liber (ex. '...') și pune în options răspunsurile posibile. " +
        "Pentru DRAG_DROP, enunțul listează elementele de ordonat/potrivit, iar options conțin ordinea corectă + distractori. " +
        "Nu inventa fapte; folosește doar conținutul lecției oferit.",
      prompt:
        `Materie: ${subjectName}. Titlul lecției: "${lessonTitle}". ` +
        `Generează exact ${count} exerciții de dificultate ${difficulty}/3. ${typeClause}\n\n` +
        `Conținutul lecției (folosește-l ca sursă unică de adevăr):\n${content.slice(0, 12000)}`,
    });

    return Response.json({ questions: object.questions });
  } catch (error) {
    console.error("generate-exercises error:", error);
    return new Response(
      JSON.stringify({ error: "Eroare la generarea exercițiilor. Verifică cheia AI și încearcă din nou." }),
      { status: 500 }
    );
  }
}