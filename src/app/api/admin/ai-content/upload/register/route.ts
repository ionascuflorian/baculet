import { currentUser, isAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { ALLOWED_MIMES } from "@/lib/ai-content/extract";
import { head } from "@vercel/blob";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const PRIORITIES = ["OFFICIAL", "HIGH", "NORMAL", "REFERENCE"] as const;

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

// Înregistrează în DB o sursă deja urcată direct la Vercel Blob din client.
// Validăm cu head() (size + content-type authoritative din Blob Store), ca
// să nu primim URL-uri arbitrare sau fișiere peste limită.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !isAdmin(user)) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  let body: { url?: unknown; projectId?: unknown; priority?: unknown; originalName?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Cerere JSON invalidă." }), { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.slice(0, 500) : "";
  const projectId = typeof body.projectId === "string" ? body.projectId.slice(0, 200) : "";
  if (!url || !projectId) {
    return new Response(JSON.stringify({ error: "Lipsesc datele (url, projectId)." }), { status: 400 });
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
    meta = await head(url);
  } catch {
    return new Response(
      JSON.stringify({ error: "Fișierul nu se află în Blob Store-ul acestui proiect." }),
      { status: 400 }
    );
  }

  if (meta.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: "Fișierul depășește 25 MB." }), { status: 413 });
  }
  const mime = (meta.contentType || "").trim().toLowerCase();
  if (!(mime in ALLOWED_MIMES)) {
    return new Response(
      JSON.stringify({ error: "Tip de fișier neacceptat. Folosește PDF, DOCX, TXT sau Markdown." }),
      { status: 400 }
    );
  }

  const source = await prisma.contentSource.create({
    data: {
      projectId,
      originalName: safeName(body.originalName),
      storageKey: url,
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