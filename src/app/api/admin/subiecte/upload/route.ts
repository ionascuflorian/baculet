import { randomUUID } from "node:crypto";
import { currentUser, hasPermission } from "@/lib/access";
import { createUploadUrl, publicBucket, r2Configured } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

const MAX_EXAM_PDF_SIZE = 25 * 1024 * 1024;
const KINDS = ["pdf", "solution"] as const;
type Kind = (typeof KINDS)[number];

function safeFileKey(kind: Kind, fileName: string): string {
  const base = String(fileName || "subiect")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  return `exams/${kind}/${randomUUID()}-${base || kind}`;
}

// Emite un presigned PUT pentru a urca un PDF de subiect/barem direct din
// browser în R2 (bucket public baculet-public). Fișierul nu trece prin
// serverless; aici doar semnăm URL-ul și validăm intenția.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_EXAMS")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }
  if (!r2Configured()) {
    return new Response(
      JSON.stringify({ error: "Stocarea R2 nu e configurată. Verifică variabilele R2_* în mediul de rulare." }),
      { status: 503 }
    );
  }

  let body: { kind?: unknown; fileName?: unknown; contentType?: unknown; size?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Cerere JSON invalidă." }), { status: 400 });
  }

  const kindRaw = String(body.kind || "");
  const kind: Kind | null = (KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as Kind) : null;
  const contentType = String(body.contentType || "").trim().toLowerCase();
  const size = Number(body.size || 0);

  if (!kind) {
    return new Response(JSON.stringify({ error: "Tip de fișier invalid (așteptam pdf sau solution)." }), { status: 400 });
  }
  if (contentType !== "application/pdf") {
    return new Response(JSON.stringify({ error: "Doar fișiere PDF sunt acceptate." }), { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_EXAM_PDF_SIZE) {
    return new Response(JSON.stringify({ error: "Fișierul depășește 25 MB." }), { status: 413 });
  }

  try {
    const target = await createUploadUrl({
      bucket: publicBucket(),
      key: safeFileKey(kind, String(body.fileName || "")),
      contentType,
    });
    return Response.json(target);
  } catch (err) {
    console.error("subiecte upload token error:", err);
    return new Response(
      JSON.stringify({ error: "Nu am putut genera URL-ul de upload. Verifică stocarea R2." }),
      { status: 500 }
    );
  }
}