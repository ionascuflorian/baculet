import { randomUUID } from "node:crypto";
import { currentUser, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ALLOWED_MIMES,
  MAX_SOURCE_SIZE,
  SOURCE_PRIORITIES,
} from "@/lib/ai-content/mimes";
import { contentBucket, createUploadUrl, r2Configured } from "@/lib/storage/r2";

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

// ── Upload direct din client la R2 (bucket privat) ────────────────────────
// Clientul cere aici un presigned PUT (payload JSON), apoi trimite fișierul
// direct la R2 — nu trece prin serverless function, deci nici limita de 4.5 MB
// a Vercel nu se aplică. Bucketul e PRIVAT: nu există URL public, iar
// fișierul e accesibil doar server-side (GetObject) sau presigned cu expirare.
// Înregistrarea în DB o face clientul după upload, printr-un apel separat
// autentificat (ruta /register).
async function handlePresignedUpload(req: Request, payload: string | null | undefined): Promise<Response> {
  if (!r2Configured()) {
    return new Response(
      JSON.stringify({ error: "Stocarea R2 nu e configurată. Adaugă variabilele R2_* în mediul de rulare." }),
      { status: 503 }
    );
  }

  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }
  const info = parseClientPayload(payload);
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

  let body: { fileName?: unknown; contentType?: unknown; size?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Cerere JSON invalidă." }), { status: 400 });
  }

  const fileName = String(body.fileName || "");
  const contentType = String(body.contentType || "").trim().toLowerCase();
  const size = Number(body.size || 0);

  if (!fileName.trim()) {
    return new Response(JSON.stringify({ error: "Lipsesc numele fișierului." }), { status: 400 });
  }
  const allowedType =
    contentType in ALLOWED_MIMES ||
    (contentType.startsWith("text/") && contentType.length > 5);
  if (!allowedType) {
    return new Response(
      JSON.stringify({ error: "Tip de fișier neacceptat. Folosește PDF, DOCX, TXT sau Markdown." }),
      { status: 400 }
    );
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: "Fișierul depășește 25 MB." }), { status: 413 });
  }

  try {
    const key = `content-studio/${info.projectId}/${randomUUID()}-${safeName(fileName)}`;
    const target = await createUploadUrl({ bucket: contentBucket(), key, contentType });
    return Response.json(target);
  } catch (err) {
    console.error("ai-content presign error:", err);
    return new Response(
      JSON.stringify({ error: "Nu am putut genera URL-ul de upload. Verifică stocarea R2." }),
      { status: 500 }
    );
  }
}

// ── Upload server-side (fallback local, fără R2) ──────────────────────────
// Folosit doar când R2 lipsește (dev local): fișierul e stocat pe disc în
// .content-studio/ (gitignored). Pe Vercel nu trebuie să apară — acolo
// clientul folosește direct upload-ul la R2.
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
      JSON.stringify({ error: "Nu am putut salva sursa. Verifică stocarea (R2) și încearcă din nou." }),
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    let body: { clientPayload?: string | null } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ error: "Cerere JSON invalidă." }), { status: 400 });
    }
    try {
      return await handlePresignedUpload(req, body?.clientPayload);
    } catch (err) {
      console.error("ai-content presign error:", err);
      return new Response(
        JSON.stringify({ error: "Nu am putut genera token-ul de upload. Verifică stocarea R2." }),
        { status: 500 }
      );
    }
  }
  return handleMultipartUpload(req);
}