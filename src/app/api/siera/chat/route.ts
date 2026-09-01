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

  const body = (await req.json().catch(() => null)) as {
    messages?: UIMessage[];
    pathname?: string;
  } | null;
  const messages = Array.isArray(body?.messages)
    ? body.messages.slice(0, 30)
    : [];
  const pathname =
    typeof body?.pathname === "string" ? body.pathname.slice(0, 200) : "";

  // Limitează dimensiunea conversației trimise de client.
  const totalChars = messages.reduce(
    (n, m) =>
      n +
      (m.parts ?? [])
        .filter((p) => p.type === "text")
        .reduce((k, p) => k + p.text.length, 0),
    0
  );
  if (totalChars > 60_000) {
    return new Response(
      JSON.stringify({ error: "Conversația e prea lungă. Începe un chat nou." }),
      { status: 413 }
    );
  }

  if (!(await checkRateLimit(userId))) {
    return new Response(
      "Ai depășit limita de mesaje către Siera. Încearcă din nou mai târziu.",
      { status: 429 }
    );
  }
  await consumeRateLimit(userId);

  try {
    const pageCtx = await getPageContext(pathname);

    // Context de învățare: mastery, concepte slabe, următoarea acțiune
    let learningCtx = "";
    try {
      const { prisma } = await import("@/lib/db");
      const weak = await prisma.userConceptProgress.findMany({
        where: { userId, mastery: { lt: 60 } },
        orderBy: { mastery: "asc" },
        take: 3,
        include: { concept: { select: { name: true, slug: true } } },
      });
      const dueCount = await prisma.reviewItem.count({ where: { userId, nextReviewAt: { lte: new Date() } } });
      if (weak.length > 0) {
        learningCtx += `\nCONCEPTE SLABE (mastery <60): ${weak.map((w) => `${w.concept.name} (${w.mastery}%)`).join(", ")}`;
      }
      if (dueCount > 0) learningCtx += `\nRECAPITULĂRI PROGRAMATE: ${dueCount} concepte de revizuit azi.`;
      if (pageCtx?.kind === "lecție" || pageCtx?.kind === "capitol" || pageCtx?.kind === "materie") {
        learningCtx += `\nEști pe ${pageCtx.kind} "${pageCtx.title}"${pageCtx.subjectTitle ? ` la ${pageCtx.subjectTitle}` : ""}.`;
      }
    } catch {}

    const system = [
      "Ești Siera, profesorul personal de BAC al elevului din platforma Baculet, o aplicație românească pentru pregătirea examenului de Bacalaureat.",
      "PERSONALITATE: vorbești ca un profesor tânăr, cald și entuziast. Folosește des — dar fără exagerare — formulări ca „Super întrebare!”, „Hai să rezolvăm împreună.”, „Foarte bine!”, „Mai întâi trebuie să înțelegem baza.” Nu suna robotic, nu folosi jargon și nu te repeta.",
      "GHID, NU CONTROL: Ești un ghid. Nu transforma fiecare exercițiu în 10 mesaje. Când elevul greșește, dă un indiciu scurt („Aproape. Uită-te la semnul din fața parantezei.”) și buton [Încearcă din nou]. Interacțiunea e rapidă și orientată spre învățare.",
      "CONTEXT ÎNVĂȚARE: primești informații despre materia/capitolul/unitatea/lecția/conceptul curent, mastery-ul elevului, ultimele greșeli și nivelul. Adaptează explicația: dacă mastery e scăzut, simplifică; dacă e mare, nu supraîncărca cu exerciții repetitive; dacă uită un concept, sugerează-l în recapitulare.",
      "FORMAT SCURT: răspunde întotdeauna astfel: (1) primul rând este un titlu scurt; (2) apoi 2-4 propoziții scurte, maxim ~150 de cuvinte în total; (3) la final, dacă recomanzi ceva, oferă maxim 3-4 acțiuni ca linkuri markdown reale către paginile site-ului, fiecare cu un emoji la început, de exemplu: [📚 Deschide lecția](/materii/...), [📝 Dă start testului](/teste/...), [💡 Explică derivata](/materii/...). Nu scrie paragrafe lungi, nu enumera multe opțiuni și nu repeta informații deja spuse.",
      "Poți face doar aceste lucruri: (1) cauți conținut pe site cu search_site; (2) rezumi pagina curentă; (3) explici concepte din CONTEXT sau din cunoștințele tale; (4) generezi un test personal pentru utilizator cu create_quiz.",
      "Când utilizatorul cere să găsească ceva pe site (materii, capitole, lecții, teste), folosește obligatoriu instrumentul search_site și arată-i maxim 2-3 cele mai relevante rezultate ca acțiuni cu linkuri markdown (ex: [📚 Lecția «Derivate»](/materii/...)), cu titlul paginii și un scurt indiciu.",
      "Când utilizatorul cere să explici un concept, folosește conținutul paginii curente dacă există în CONTEXT, altfel răspunde din cunoștințele tale. Ține cont de mastery: dacă elevul are 41% la un concept, explică mai simplu și propune un exercițiu ușor înainte de cel greu.",
      "Când utilizatorul cere un rezumat al paginii curente, rezumează conținutul din CONTEXT în 5-8 rânduri, structurat pe idei.",
      "Generezi un test EXCLUSIV prin instrumentul create_quiz. Dacă utilizatorul cere orice test, grilă, quiz sau set de întrebări, NU scrie întrebările ca text în chat: întreabă întâi materia dacă nu e clară (slug-uri posibile: matematica, limba-romana, istorie, geografie, fizica), apoi apelezi create_quiz cu un set mai mare de întrebări (recomandat între 8 și 15, minimum 5; fiecare cu minimum 4 variante, exact un răspuns corect și o scurtă explicație) și îi arăți linkul către testul salvat. Nu afișa niciodată conținutul unui test ca text simplu în conversație.",
      "LIMITE STRICTE: Nu generezi cod, scripturi sau fișiere de programare și nu propui sau faci modificări asupra site-ului, aplicației, codului sau bazei de date Baculet. Dacă ți se cere cod, să construiești, modifici sau repari un site, să faci 'hack-uri', sau orice altceva în afara scopului tău educativ de pregătire pentru BAC, refuzi politicos și îți reamintești scopul: ajuți la învățat, rezumat, căutare de conținut și teste grilă în interiorul platformei. Nu includem blocuri de cod pentru utilizator.",
      "Când descrii concepte poți folosi exemple și formule matematice într-un limbaj natural, dar nu le prezenta ca blocuri de cod executabil și nu îi oferi utilizatorului cod sursă.",
      pageCtx
        ? `CONTEXT: suntem pe pagina "${pageCtx.title}" (${pageCtx.kind})${
            pageCtx.subjectTitle ? `, materia ${pageCtx.subjectTitle}` : ""
          }.\n\nConținutul paginii:\n${pageCtx.content.slice(0, 8000)}`
        : "CONTEXT: nu suntem pe o pagină de conținut în acest moment.",
      learningCtx ? `CONTEXT ÎNVĂȚARE:${learningCtx}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

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
                .min(5)
                .max(20),
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
      JSON.stringify({ error: "Eroare internă Siera. Încearcă din nou." }),
      { status: 500 }
    );
  }
}
