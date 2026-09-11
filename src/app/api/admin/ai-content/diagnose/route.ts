import { currentUser, isAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

type ProbeResult = { name: string; ok: boolean; error?: string };

async function probe(name: string, load: () => Promise<unknown>): Promise<ProbeResult> {
  try {
    await load();
    return { name, ok: true };
  } catch (err) {
    return { name, ok: false, error: err instanceof Error ? (err.stack || err.message) : String(err) };
  }
}

// Diagnostic folosit pentru a identifica importurile care crapă la module-load
// pe runtime-ul Vercel (nu se reproduce în dev). Nu expune secrete.
export async function GET() {
  const user = await currentUser();
  if (!user || !isAdmin(user)) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  const result = {
    node: process.version,
    nodeEnv: process.env.NODE_ENV,
    env: {
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      blobTokenLength: String(process.env.BLOB_READ_WRITE_TOKEN || "").length,
    },
    probes: await Promise.all([
      probe("@vercel/blob", () => import("@vercel/blob")),
      probe("@vercel/blob/client", () => import("@vercel/blob/client")),
      probe("pdf-parse", () => import("pdf-parse")),
      probe("mammoth", () => import("mammoth")),
      probe("ai-content/extract", () => import("@/lib/ai-content/extract")),
      probe("ai-content/storage", () => import("@/lib/ai-content/storage")),
    ]),
  };
  return Response.json(result);
}