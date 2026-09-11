// Stocarea fișierelor sursă: Vercel Blob în producție/dev cu token,
// fallback local (pe disc) pentru dezvoltare fără BLOB_READ_WRITE_TOKEN.
import { put, del, head } from "@vercel/blob";
import { readFile, writeFile, mkdir, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const LOCAL_DIR = join(process.cwd(), ".content-studio");
const LOCAL_PREFIX = "local:";

function canUseBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function storeSourceFile(
  file: { data: Uint8Array; mimeType: string; fileName: string }
): Promise<{ storageKey: string }> {
  if (canUseBlob()) {
    const blobUrl = await put(`content-studio/${file.fileName}`, Buffer.from(file.data), {
      access: "public",
      contentType: file.mimeType,
    });
    return { storageKey: blobUrl.url };
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  const key = `${LOCAL_DIR}/${randomUUID()}-${file.fileName}`;
  await writeFile(key, file.data);
  return { storageKey: `${LOCAL_PREFIX}${key}` };
}

export async function deleteSourceFile(storageKey: string): Promise<void> {
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    const path = storageKey.slice(LOCAL_PREFIX.length);
    try {
      await unlink(path);
    } catch {}
    return;
  }
  try {
    await del(storageKey);
  } catch {}
}

export async function fetchSourceFile(storageKey: string): Promise<{ data: Buffer; mime: string }> {
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    const path = storageKey.slice(LOCAL_PREFIX.length);
    const data = await readFile(path);
    return { data, mime: mimeFromName(path) };
  }
  const meta = await head(storageKey);
  const res = await fetch(storageKey);
  if (!res.ok) throw new Error("Nu am putut descărca fișierul sursă");
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf, mime: meta.contentType || mimeFromName(urlName(storageKey)) };
}

function urlName(url: string): string {
  try {
    return new URL(url).pathname.split("/").pop() || "file";
  } catch {
    return "file";
  }
}

function mimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "text/markdown";
  return "text/plain";
}

export async function blobConfigured(): Promise<boolean> {
  return canUseBlob();
}

export async function localUploadsExist(): Promise<boolean> {
  try {
    await access(LOCAL_DIR);
    return true;
  } catch {
    return false;
  }
}

// Rezolvă șablonul host pentru Vercel Blob (afișat în UI de configurare).
export function suggestedBlobEnvExample(): string {
  return "BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...";
}