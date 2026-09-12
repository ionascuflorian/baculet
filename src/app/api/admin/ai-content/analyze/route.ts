import { currentUser, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/db";
import { processSource, refreshProjectStatus } from "@/lib/ai-content/run";
import { z } from "zod/v4";

export const dynamic = "force-dynamic";
// Procesarea include extragere + embeddinguri (apeluri AI externe) + inserare
// chunk-uri în batch; pe Vercel trebuie spațiu de timp peste default-ul de 10s.
export const maxDuration = 300;

const analyzeSchema = z.object({
  sourceId: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "sourceId invalid." }), { status: 400 });
  }

  const source = await prisma.contentSource.findUnique({
    where: { id: parsed.data.sourceId },
    select: { projectId: true },
  });
  if (!source) {
    return new Response(JSON.stringify({ error: "Sursa nu există." }), { status: 404 });
  }

  try {
    const result = await processSource(parsed.data.sourceId, user.id);
    await refreshProjectStatus(source.projectId);
    return Response.json({ ok: result.ok, chunks: result.chunks, error: result.error });
  } catch (err) {
    console.error("ai-content analyze error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Eroare la procesarea sursei." }),
      { status: 500 }
    );
  }
}