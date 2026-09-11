import { currentUser, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ALLOWED_MIMES,
  MAX_SOURCE_SIZE,
  SOURCE_PRIORITIES,
} from "@/lib/ai-content/mimes";
import type { HandleUploadBody } from "@vercel/blob/client";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = MAX_SOURCE_SIZE;
const PRIORITIES = SOURCE_PRIORITIES;

function safeName(name: unknown): string {
  const base = String(name || "sursa")
    .split(/[\\/]/)
    .pop()
    ?.slice(0, 120);
  return base || "sursa";
}

function priorityOf(raw: unknown): (typeof PRIORITIES)[number] {
  const v = String(raw || "NORMAL").toUpperCase();
  return (PRIORITIES as readonly string[]).includes(v) ? (v as (typeof PRIORITIES)[number]) : "NORMAL";
}

function parseClientPayload(payload: string | null | undefined): { projectId: string; priority: string } | null {
  if (!payload) return null;
  try {
    const o = JSON.parse(payload) as { projectId?: unknown; priority?: unknown };
    return {
      projectId: String(o.projectId || "").slice(0, 200),
      priority: String(o.priority || "NORMAL"),
    };
  } catch {
    return null;
  }
}

// ── Upload direct din client la Vercel Blob ────────────────────────────────
// Clientul cere aici un "client token" (payload JSON), apoi trimite fișierul
// direct la Blob — nu trece prin serverless function, deci nici limita de
// 4.5 MB a Vercel nu se aplică. Înregistrarea în DB o face clientul după
// upload, printr-un apel separat autentificat (ruta /register).
async function handleBlobUpload(
  req: Request,
  body: HandleUploadBody
): Promise<Response> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Vercel Blob nu e configurat. Adaugă BLOB_READ_WRITE_TOKEN în variabilele de mediu." }),
      { status: 503 }
    );
  }

  if (body.type !== "blob.generate-client-token") {
    // Nu folosim webhook-ul de completare (callback URL nepus) — înregistrarea
    // în DB o face clientul după upload, prin ruta /register. Doar ack.
    return Response.json({ type: body.type, response: "ok" });
  }

  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }
  const info = parseClientPayload(body.payload?.clientPayload);
  if (!info || !info.projectId) {
    return new Response(JSON.stringify({ error: "Cerere invalidă: lipsește proiectul." }), { status: 400 });
  }
  const project = await prisma.contentProject.findUnique({
    where: { id: info.projectId },
    select: { id: true },
  });
  if (!project) {
    return new Response(JSON.stringify({ error: "Proiect inexistent." }), { status: 404 });
  }

  const { handleUpload } = await import("@vercel/blob/client");
  const res = await handleUpload({
    token: process.env.BLOB_READ_WRITE_TOKEN,
    request: req,
    body,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [...Object.keys(ALLOWED_MIMES), "text/*"],
      maximumSizeInBytes: MAX_FILE_SIZE,
      addRandomSuffix: true,
      validUntil: Date.now() + 30 * 60 * 1000,
    }),
  });
  return Response.json(res);
}

// ── Upload server-side (fallback local, fără Blob) ─────────────────────────
// Folosit doar când BLOB_READ_WRITE_TOKEN lipsește (dev local): fișierul e
// stocat pe disc în .content-studio/ (gitignored). Pe Vercel nu trebuie să
// apară — acolo clientul folosește direct upload-ul la Blob.
async function handleMultipartUpload(req: Request): Promise<Response> {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Cerere multipart invalidă." }), { status: 400 });
  }

  const projectId = String(form.get("projectId") || "").slice(0, 200);
  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return new Response(JSON.stringify({ error: "Proiect inexistent." }), { status: 404 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "Lipsește fișierul." }), { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: "Fișierul depășește 25 MB." }), { status: 413 });
  }

  const mime = file.type.trim().toLowerCase();
  if (!(mime in ALLOWED_MIMES)) {
    return new Response(
      JSON.stringify({ error: "Tip de fișier neacceptat. Folosește PDF, DOCX, TXT sau Markdown." }),
      { status: 400 }
    );
  }

  const fileName = safeName(file.name);
  const data = Buffer.from(await file.arrayBuffer());

  try {
    const { storeSourceFile } = await import("@/lib/ai-content/storage");
    const { storageKey } = await storeSourceFile({ data, mimeType: mime, fileName });
    const source = await prisma.contentSource.create({
      data: {
        projectId,
        originalName: fileName,
        storageKey,
        mime,
        size: file.size,
        priority: priorityOf(form.get("priority")),
        status: "UPLOADED",
        uploadedById: user.id,
      },
      select: { id: true, originalName: true, mime: true, size: true, priority: true },
    });
    return Response.json({ ok: true, source });
  } catch (err) {
    console.error("ai-content upload error:", err);
    return new Response(
      JSON.stringify({ error: "Nu am putut salva sursa. Verifică stocarea (Vercel Blob) și încearcă din nou." }),
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    let body: HandleUploadBody;
    try {
      body = (await req.json()) as HandleUploadBody;
    } catch {
      return new Response(JSON.stringify({ error: "Cerere JSON invalidă." }), { status: 400 });
    }
    try {
      return await handleBlobUpload(req, body);
    } catch (err) {
      console.error("ai-content blob token error:", err);
      return new Response(
        JSON.stringify({ error: "Nu am putut genera token-ul de upload. Verifică Vercel Blob." }),
        { status: 500 }
      );
    }
  }
  return handleMultipartUpload(req);
}