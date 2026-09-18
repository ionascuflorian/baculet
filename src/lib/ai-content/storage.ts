// Stocarea fișierelor sursă AI Content Studio: bucket PRIVAT în Cloudflare R2
// (R2_CONTENT_BUCKET) în producție/dev cu credențiale R2, fallback local (pe
// disc) pentru dezvoltare fără configurare R2. Fișierele private sunt accesate
// exclusiv server-side (GetObject) sau prin URL-uri presigned cu expirare.
//
// storageKey poate fi:
//  - "local:.../cale/fisier"  → fallback de dezvoltare pe disc
//  - "https://...blob.vercel-storage.com/..." → fișier legacy migrat de pe
//    Vercel Blob (încă descărcabil public, șters tot prin Blob)
//  - orice altă cheie            → obiect în bucketul privat R2
import { readFile, writeFile, mkdir, unlink, access } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { contentBucket, deleteObject, getObject, putObject, r2Configured } from "@/lib/storage/r2";

const LOCAL_DIR = join(process.cwd(), ".content-studio");
const LOCAL_PREFIX = "local:";
const LEGACY_BLOB_HOST = "blob.vercel-storage.com";

function canUseR2(): boolean {
  return r2Configured();
}

export async function storeSourceFile(
  file: { data: Uint8Array; mimeType: string; fileName: string }
): Promise<{ storageKey: string }> {
  if (canUseR2()) {
    const key = `content-studio/${randomUUID()}-${file.fileName}`;
    await putObject({ bucket: contentBucket(), key, data: file.data, contentType: file.mimeType });
    return { storageKey: key };
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
  if (storageKey.startsWith("https://") && storageKey.includes(LEGACY_BLOB_HOST)) {
    try {
      const { del } = await import("@vercel/blob");
      await del(storageKey);
    } catch {}
    return;
  }
  if (storageKey.startsWith("https://")) {
    // URL public legat manual (ex. sursă adăugată ca link) — nu ștergem.
    return;
  }
  try {
    await deleteObject(contentBucket(), storageKey);
  } catch {}
}

export async function fetchSourceFile(storageKey: string): Promise<{ data: Buffer; mime: string }> {
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    const path = storageKey.slice(LOCAL_PREFIX.length);
    const data = await readFile(path);
    return { data, mime: mimeFromName(path) };
  }
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    // Legacy (Vercel Blob) sau link extern public: descărcăm direct.
    const res = await fetch(storageKey);
    if (!res.ok) throw new Error("Nu am putut descărca fișierul sursă");
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: buf, mime: mimeFromName(urlName(storageKey)) };
  }
  const obj = await getObject(contentBucket(), storageKey);
  if (!obj) throw new Error("Fișierul sursă nu mai există în stocare.");
  return { data: Buffer.from(obj.data), mime: obj.contentType || mimeFromName(storageKey) };
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

export async function storageConfigured(): Promise<boolean> {
  return r2Configured();
}

// Alias retrocompat: păstrează numele vechi (bazat pe Blob) păstrând semantica
// „stocarea cloud e configurată”.
export async function blobConfigured(): Promise<boolean> {
  return r2Configured();
}

export async function localUploadsExist(): Promise<boolean> {
  try {
    await access(LOCAL_DIR);
    return true;
  } catch {
    return false;
  }
}

// Șablon de variabile de mediu R2 (afișat în UI-ul de configurare).
export function suggestedStorageEnvExample(): string {
  return [
    "R2_ACCOUNT_ID=<account-id>",
    "R2_ACCESS_KEY_ID=<access-key-id>",
    "R2_SECRET_ACCESS_KEY=<secret-access-key>",
    "R2_PUBLIC_BUCKET=baculet-public",
    "R2_CONTENT_BUCKET=baculet-content",
    "R2_PUBLIC_BASE_URL=https://files.baculet.com",
  ].join("\n");
}

export function suggestedBlobEnvExample(): string {
  return suggestedStorageEnvExample();
}