import { currentUser, hasPermission } from "@/lib/access";
import { r2Configured } from "@/lib/storage/r2";

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
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  const result = {
    node: process.version,
    nodeEnv: process.env.NODE_ENV,
    env: {
      r2Configured: r2Configured(),
      r2AccountSet: Boolean(process.env.R2_ACCOUNT_ID),
      r2PublicBucketSet: Boolean(process.env.R2_PUBLIC_BUCKET),
      r2ContentBucketSet: Boolean(process.env.R2_CONTENT_BUCKET),
      r2PublicBaseSet: Boolean(process.env.R2_PUBLIC_BASE_URL),
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      blobTokenLength: String(process.env.BLOB_READ_WRITE_TOKEN || "").length,
    },
    probes: await Promise.all([
      probe("aws-sdk/client-s3", () => import("@aws-sdk/client-s3")),
      probe("aws-sdk/s3-request-presigner", () => import("@aws-sdk/s3-request-presigner")),
      probe("storage/r2", () => import("@/lib/storage/r2")),
      probe("pdf-parse", () => import("pdf-parse")),
      probe("mammoth", () => import("mammoth")),
      probe("ai-content/extract", () => import("@/lib/ai-content/extract")),
      probe("ai-content/storage", () => import("@/lib/ai-content/storage")),
    ]),
  };
  return Response.json(result);
}