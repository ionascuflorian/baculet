import { currentUser, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/db";
import {
  ALLOWED_MIMES,
  MAX_SOURCE_SIZE,
  SOURCE_PRIORITIES,
} from "@/lib/ai-content/mimes";
import { contentBucket, headObject } from "@/lib/storage/r2";

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

// Înregistrează în DB o sursă deja urcată direct la R2 (bucket privat) din
// client. Validăm cu headObject (size + content-type autoritativ din R2) și
// excludem chei din afara prefixului content-studio/, ca să nu acceptăm
// obiecte arbitrare sau fișiere peste limită.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  let body: { storageKey?: unknown; projectId?: unknown; priority?: unknown; originalName?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Cerere JSON invalidă." }), { status: 400 });
  }

  const storageKey = typeof body.storageKey === "string" ? body.storageKey.slice(0, 500) : "";
  const projectId = typeof body.projectId === "string" ? body.projectId.slice(0, 200) : "";
  if (!storageKey || !projectId) {
    return new Response(JSON.stringify({ error: "Lipsesc datele (storageKey, projectId)." }), { status: 400 });
  }
  if (!storageKey.startsWith("content-studio/")) {
    return new Response(JSON.stringify({ error: "Cheia de stocare invalidă." }), { status: 400 });
  }

  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return new Response(JSON.stringify({ error: "Proiect inexistent." }), { status: 404 });
  }

  let meta;
  try {
    meta = await headObject(contentBucket(), storageKey);
  } catch {
    return new Response(
      JSON.stringify({ error: "Fișierul nu se află în stocarea R2 a acestui proiect." }),
      { status: 400 }
    );
  }
  if (!meta) {
    return new Response(JSON.stringify({ error: "Fișierul nu mai există în stocare." }), { status: 404 });
  }

  if (meta.size <= 0 || meta.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: "Fișierul depășește 25 MB." }), { status: 413 });
  }
  const mime = (meta.contentType || "").trim().toLowerCase();
  const allowedMime = mime in ALLOWED_MIMES || mime.startsWith("text/");
  if (!allowedMime) {
    return new Response(
      JSON.stringify({ error: "Tip de fișier neacceptat. Folosește PDF, DOCX, TXT sau Markdown." }),
      { status: 400 }
    );
  }

  const source = await prisma.contentSource.create({
    data: {
      projectId,
      originalName: safeName(body.originalName),
      storageKey,
      mime,
      size: meta.size,
      priority: priorityOf(body.priority),
      status: "UPLOADED",
      uploadedById: user.id,
    },
    select: { id: true, originalName: true, mime: true, size: true, priority: true },
  });
  return Response.json({ ok: true, source });
}