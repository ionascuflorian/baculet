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
import { z } from "zod/v4";
import { currentUser, isAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { resolveStudioModel } from "@/lib/ai-content/provider";
import { assistantCanChat } from "@/lib/ai-content/rate";
import { searchProjectChunks, searchLiveContent } from "@/lib/ai-content/retrieval";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !isAdmin(user)) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }
  const userId = user.id;

  const body = (await req.json().catch(() => null)) as {
    messages?: UIMessage[];
    projectId?: string;
  } | null;
  const messages = Array.isArray(body?.messages) ? body.messages.slice(0, 30) : [];
  const projectId = typeof body?.projectId === "string" ? body.projectId.slice(0, 200) : "";

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

  if (!(await assistantCanChat(userId))) {
    return new Response(
      "Ai depășit limita de mesaje către Asistentul Content Studio. Încearcă mai târziu.",
      { status: 429 }
    );
  }

  try {
    let projectCtx = "";
    if (projectId) {
      try {
        const project = await prisma.contentProject.findUnique({
          where: { id: projectId },
          select: {
            name: true,
            status: true,
            subject: { select: { name: true } },
            _count: { select: { sources: true, nodes: true, items: true, chunks: true } },
          },
        });
        if (project) {
          projectCtx = `Proiect: „${project.name}” (${project.subject.name}), status ${project.status}. ` +
            `Surse: ${project._count.sources}, noduri curriculum: ${project._count.nodes}, ` +
            `iteme generate: ${project._count.items}, chunks procesate: ${project._count.chunks}.`;
        }
      } catch {}
    }

    const studio = await resolveStudioModel();

    const system = [
      "Ești Asistentul AI Content Studio din Băculeț: îl ajuți pe redactorul admin să construiască proiecte BAC curatoriale.",
      "POATE doar: (1) să caute în chunks-urile surselor unui proiect cu search_project_chunks; (2) să caute conținut Băculeț deja publicat cu search_live_content (ca să eviți duplicatele).",
      "Răspunde în română, scurt și concret. Când utilizezi o căutare, citează numele sursei și pagina, apoi rezumă pasajul relevant.",
      "Nu generezi draft-uri de lecții/quiz-uri în chat — aceasta se face din panou cu butoanele de generare. Rolul tău este verificarea faptelor, găsirea pasajelor în surse, verificarea acoperirii și detectarea duplicatelor.",
      "Nu modifici direct baza de date și nu publici conținut.",
      projectCtx ? `CONTEXT: ${projectCtx}` : "CONTEXT: nu este selectat un proiect. Recomandă să alegi un proiect din lista din stânga.",
    ].join("\n\n");

    const result = streamText({
      model: studio.model,
      system,
      messages: await convertToModelMessages(messages),
      tools: {
        search_project_chunks: tool({
          description:
            "Caută în sursele încărcate + procesate ale unui proiect AI Content Studio (chunks cu embeddings și full-text). Folosește-l pentru a verifica dacă un fapt/concept este acoperit de surse.",
          inputSchema: zodSchema(
            z.object({
              projectId: z.string().describe("ID-ul proiectului AI Content Studio"),
              query: z.string().describe("Termenul de căutat, preferabil 2-6 cuvinte cheie"),
              limit: z.number().int().min(1).max(12).default(6),
            })
          ),
          execute: async ({ projectId: pid, query, limit }) => {
            const hits = await searchProjectChunks(pid, query, { limit });
            return hits.map((h) => ({
              chunkId: h.chunkId,
              source: h.sourceName,
              page: h.page,
              section: h.section ?? null,
              score: h.score,
              text: h.text.slice(0, 600),
            }));
          },
        }),
        search_live_content: tool({
          description:
            "Caută conținut LIVE publicat pe Băculeț (lecții, unități, capitole, teste) după termen, pentru detectarea duplicatelor înainte de publicare.",
          inputSchema: zodSchema(
            z.object({ query: z.string().describe("Termenul de căutat") })
          ),
          execute: async ({ query }) => searchLiveContent(query),
        }),
      },
      stopWhen: isStepCount(4),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("ai-content assistant error:", error);
    return new Response(
      JSON.stringify({ error: "Eroare internă. Verifică cheia AI și încearcă din nou." }),
      { status: 500 }
    );
  }
}