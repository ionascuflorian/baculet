import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod/v4";
import { currentUser, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/db";
import { decryptApiKey } from "@/lib/ai-keys";

export const dynamic = "force-dynamic";

const questionSchema = z.object({
  text: z.string().min(2),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0).default(0),
  explanation: z.string().optional().default(""),
  type: z
    .enum([
      "SINGLE",
      "CLOZE",
      "FLASHCARD",
      "DRAG_DROP",
      "SINGLE_CHOICE",
      "TRUE_FALSE",
      "MULTIPLE_CHOICE",
      "FILL_BLANK",
      "ORDERING",
    ])
    .default("SINGLE_CHOICE"),
  answer: z.unknown().optional(),
});

const exercisesSchema = z.object({
  questions: z.array(questionSchema).min(1),
});

type ProviderName = "google" | "openai" | "anthropic" | "openrouter";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function getModel(provider: ProviderName, apiKey: string, modelId?: string | null) {
  const model = modelId?.trim() || null;
  switch (provider) {
    case "openrouter":
      return createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL })(
        model ?? "openai/gpt-4o-mini"
      );
    case "openai":
      return createOpenAI({ apiKey })(model ?? "gpt-4o-mini");
    case "anthropic":
      return createAnthropic({ apiKey })(model ?? "claude-3-5-haiku-latest");
    case "google":
    default:
      return createGoogleGenerativeAI({ apiKey })(
        model ?? (process.env.SIERA_MODEL || "gemini-3.5-flash-lite")
      );
  }
}

const TYPE_LABELS: Record<string, string> = {
  SINGLE: "cu alegere (grilă)",
  CLOZE: "completare (gap)",
  FLASHCARD: "flashcard",
  DRAG_DROP: "ordonează / potrivește",
  SINGLE_CHOICE: "cu alegere (grilă)",
  TRUE_FALSE: "adevărat / fals",
  MULTIPLE_CHOICE: "cu alegere multiplă",
  FILL_BLANK: "completare",
  ORDERING: "ordonare",
};

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { aiProvider: true, aiApiKeyEnc: true, aiModel: true },
  });

  const provider = (dbUser?.aiProvider as ProviderName) || "google";
  const modelId = dbUser?.aiModel ?? null;
  let apiKey: string | null = null;
  if (dbUser?.aiApiKeyEnc) {
    try {
      apiKey = decryptApiKey(dbUser.aiApiKeyEnc);
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
    [
      "SINGLE",
      "CLOZE",
      "FLASHCARD",
      "DRAG_DROP",
      "SINGLE_CHOICE",
      "TRUE_FALSE",
      "MULTIPLE_CHOICE",
      "FILL_BLANK",
      "ORDERING",
    ].includes(t)
  );
  const typeClause = types.length
    ? `Tipuri permise: ${types.map((t) => TYPE_LABELS[t] ?? t).join(", ")}. Folosește doar aceste tipuri.`
    : "Variantează tipurile: grilă, adevărat/fals, completare, ordonare.";

  try {
    const { object } = await generateObject({
      model: getModel(provider, apiKey, modelId),
      schema: exercisesSchema,
      system:
        "Ești un profesor român de bacalaureat. Creezi exerciții de fixare pentru lecțiile de la școală. " +
        "Întrebările trebuie să fie în limba română, corecte din punct de vedere științific, adaptate nivelului elevului. " +
        "'text' = enunțul; 'options' = variantele de răspuns; 'correctIndex' = indexul obiectiv al steagului de corectitudine (pentru grile/adevărat-fals); " +
        "pentru MULTIPLE_CHOICE, FILL_BLANK și ORDERING completează și 'answer' cu structura: " +
        "{ kind: 'multiple', indices: [...] } / { kind: 'fill_blank', accepted: [...] } / { kind: 'ordering', order: [0,1,...] }. " +
        "'explanation' = o explicație scurtă de ce e corect. Pentru CLOZE, scrie enunțul cu spațiu liber (ex. '...') și pun în options răspunsurile posibile. " +
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