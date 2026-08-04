import {
  createUIMessageStreamResponse,
  convertToModelMessages,
  streamText,
  toUIMessageStream,
  tool,
  zodSchema,
  isStepCount,
  type UIMessage,
} from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { searchSiteContent, getPageContext } from "@/lib/siera/site";
import { checkRateLimit, consumeRateLimit } from "@/lib/siera/rate-limit";
import { createQuizForUser } from "@/lib/siera/create-quiz";

export const dynamic = "force-dynamic";

const MODEL = process.env.SIERA_MODEL || "gemini-3.5-flash-lite";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), {
      status: 401,
    });
  }
  const userId = session.user.id;

  const body = (await req.json()) as { messages: UIMessage[]; pathname?: string };
  const messages = body.messages ?? [];
  const pathname = body.pathname ?? "";

  if (!checkRateLimit(userId)) {
    return new Response(
      "Ai depășit limita de mesaje către Siera. Încearcă din nou mai târziu.",
      { status: 429 }
    );
  }
  consumeRateLimit(userId);

  try {
    const pageCtx = await getPageContext(pathname);

    const system = [
      "Ești Siera, asistentul inteligent integrat în platforma Baculet, o aplicație românească pentru pregătirea examenului de Bacalaureat.",
      "Răspunde întotdeauna în limba română, prietenos și structurat, cu titluri scurte și liste clare.",
      "Poți face doar aceste lucruri: (1) cauți conținut pe site cu search_site; (2) rezumi pagina curentă; (3) explici concepte din CONTEXT sau din cunoștințele tale; (4) generezi un test personal pentru utilizator cu create_quiz.",
      "Când utilizatorul cere să găsească ceva pe site (materii, capitole, lecții, teste), folosește obligatoriu instrumentul search_site și arată-i linkurile găsite ca listă cu titluri.",
      "Când utilizatorul cere să explici un concept, folosește conținutul paginii curente dacă există în CONTEXT, altfel răspunde din cunoștințele tale.",
      "Când utilizatorul cere un rezumat al paginii curente, rezumează conținutul din CONTEXT în 5-8 rânduri, structurat pe idei.",
      "Generezi un test EXCLUSIV prin instrumentul create_quiz. Dacă utilizatorul cere orice test, grilă, quiz sau set de întrebări, NU scrie întrebările ca text în chat: întreabă întâi materia dacă nu e clară (slug-uri posibile: matematica, limba-romana, istorie, geografie, fizica), apoi apelezi create_quiz cu întrebări valide (minimum 4 variante, exact un răspuns corect, o scurtă explicație la fiecare) și îi arăți linkul către testul salvat. Nu afișa niciodată conținutul unui test ca text simplu în conversație.",
      "LIMITE STRICTE: Nu generezi cod, scripturi sau fișiere de programare și nu propui sau faci modificări asupra site-ului, aplicației, codului sau bazei de date Baculet. Dacă ți se cere cod, să construiești, modifici sau repari un site, să faci 'hack-uri', sau orice altceva în afara scopului tău educativ de pregătire pentru BAC, refuzi politicos și îți reamintești scopul: ajuți la învățat, rezumat, căutare de conținut și teste grilă în interiorul platformei. Nu includem blocuri de cod pentru utilizator.",
      "Când descrii concepte poți folosi exemple și formule matematice într-un limbaj natural, dar nu le prezenta ca blocuri de cod executabil și nu îi oferi utilizatorului cod sursă.",
      pageCtx
        ? `CONTEXT: suntem pe pagina "${pageCtx.title}" (${pageCtx.kind})${
            pageCtx.subjectTitle ? `, materia ${pageCtx.subjectTitle}` : ""
          }.\n\nConținutul paginii:\n${pageCtx.content.slice(0, 8000)}`
        : "CONTEXT: nu suntem pe o pagină de conținut în acest moment.",
    ].join("\n\n");

    const result = streamText({
      model: google(MODEL),
      system,
      messages: await convertToModelMessages(messages),
      tools: {
        search_site: tool({
          description:
            "Caută conținutul site-ului Baculet (materii, capitole, lecții, teste) după un termen și returnează rezultate cu linkuri către pagini.",
          inputSchema: zodSchema(
            z.object({
              query: z.string().describe("Termenul de căutat"),
            })
          ),
          execute: async ({ query }) => searchSiteContent(query),
        }),
        create_quiz: tool({
          description:
            "Generează și salvează un test personal pentru utilizator, cu întrebări și răspunsuri. Returnează linkul către testul creat.",
          inputSchema: zodSchema(
            z.object({
              subjectSlug: z.string().describe("Slug-ul materiei, ex: matematica."),
              title: z.string().describe("Titlul testului"),
              description: z.string().optional().describe("Scurtă descriere"),
              difficulty: z.number().int().min(1).max(3).default(1),
              questions: z
                .array(
                  z.object({
                    text: z.string().describe("Textul întrebării"),
                    options: z
                      .array(z.string())
                      .min(4)
                      .max(6)
                      .describe("Variantele de răspuns"),
                    correctIndex: z
                      .number()
                      .int()
                      .describe("Indexul (0-based) al variantei corecte"),
                    explanation: z.string().optional().describe("Explicația răspunsului"),
                  })
                )
                .min(3)
                .max(12),
            })
          ),
          execute: async (params) => createQuizForUser(userId, params),
        }),
      },
      stopWhen: isStepCount(4),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("Siera chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Eroare internă Siera",
      }),
      { status: 500 }
    );
  }
}
