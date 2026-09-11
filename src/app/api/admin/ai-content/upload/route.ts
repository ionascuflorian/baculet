import { currentUser, isAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { ALLOWED_MIMES } from "@/lib/ai-content/extract";
import { storeSourceFile } from "@/lib/ai-content/storage";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function safeName(name: string): string {
  const base = String(name || "sursa")
    .split(/[\\/]/)
    .pop()
    ?.slice(0, 120);
  return base || "sursa";
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || !isAdmin(user)) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Cerere multipart invalidă." }), { status: 400 });
  }

  const projectId = String(form.get("projectId") || "").slice(0, 200);
  const priorityRaw = String(form.get("priority") || "NORMAL").toUpperCase();
  const priority = ["OFFICIAL", "HIGH", "NORMAL", "REFERENCE"].includes(priorityRaw)
    ? priorityRaw
    : "NORMAL";

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
    return new Response(
      JSON.stringify({ error: "Fișierul depășește 25 MB." }),
      { status: 413 }
    );
  }

  const mime = file.type.trim().toLowerCase();
  if (!(mime in ALLOWED_MIMES)) {
    return new Response(
      JSON.stringify({
        error: "Tip de fișier neacceptat. Folosește PDF, DOCX, TXT sau Markdown.",
      }),
      { status: 400 }
    );
  }

  const fileName = safeName(file.name);
  const data = Buffer.from(await file.arrayBuffer());

  try {
    const { storageKey } = await storeSourceFile({
      data,
      mimeType: mime,
      fileName,
    });
    const source = await prisma.contentSource.create({
      data: {
        projectId,
        originalName: fileName,
        storageKey,
        mime,
        size: file.size,
        priority: priority as "OFFICIAL" | "HIGH" | "NORMAL" | "REFERENCE",
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