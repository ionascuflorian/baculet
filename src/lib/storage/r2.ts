// Nucleu Cloudflare R2 (S3-compatible) pentru Băculeț.
//
// Două bucketuri pe care se bazează întreg proiectul:
//  - R2_PUBLIC_BUCKET  ("baculet-public")  → doar subiecte/bareme BAC, servite
//    public prin R2_PUBLIC_BASE_URL (custom domain, de ex. files.baculet.com).
//  - R2_CONTENT_BUCKET ("baculet-content") → sursele AI Content Studio, PRIVATE:
//    accesate exclusiv server-side (GetObject) sau prin presigned (expirare).
//
// Credențialele R2 nu se expun niciodată către client: browserul primește doar
// un presigned URL de scriere (PUT), scurt și validat.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function env(name: string): string {
  return process.env[name] ?? "";
}

export function r2Configured(): boolean {
  return Boolean(
    env("R2_ACCOUNT_ID") &&
      env("R2_ACCESS_KEY_ID") &&
      env("R2_SECRET_ACCESS_KEY") &&
      env("R2_PUBLIC_BUCKET") &&
      env("R2_CONTENT_BUCKET") &&
      env("R2_PUBLIC_BASE_URL")
  );
}

export function publicBucket(): string {
  return env("R2_PUBLIC_BUCKET");
}

export function contentBucket(): string {
  return env("R2_CONTENT_BUCKET");
}

export function publicBaseUrl(): string {
  return env("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      // R2 nu implementează checksum-urile S3 in mod implicit: cerem doar cand
      // e cerut, altfel PUT/GET pica la bucketurile noi cu ChecksumAlgorithm.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export interface UploadTarget {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

// Emite un presigned PUT pentru upload direct din browser în R2.
// ContentType-ul este semnat în URL: clientul TREBUIE sa trimita exact
// acel Content-Type, altfel R2 raspunde 403 SignatureDoesNotMatch.
export async function createUploadUrl(params: {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<UploadTarget> {
  const expiresIn = params.expiresIn ?? 15 * 60; // 15 min e suficient
  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: params.bucket, Key: params.key, ContentType: params.contentType }),
    { expiresIn }
  );
  return { uploadUrl, key: params.key, expiresIn };
}

// Upload server-side direct (folosit pentru bucketuri private precum sursele
// AI Content Studio, unde nu exista URL public și nu vrem ca fișierul sa
// treaca prin browser).
export async function putObject(params: {
  bucket: string;
  key: string;
  data: Uint8Array;
  contentType: string;
}): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.data,
      ContentType: params.contentType,
    })
  );
}

export interface ObjectMeta {
  size: number;
  contentType: string;
  etag?: string;
}

export async function headObject(bucket: string, key: string): Promise<ObjectMeta | null> {
  try {
    const res = await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      size: res.ContentLength ?? 0,
      contentType: res.ContentType ?? "",
      etag: res.ETag,
    };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw err;
  }
}

export async function getObject(
  bucket: string,
  key: string
): Promise<{ data: Uint8Array; contentType: string } | null> {
  try {
    const res = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    const buf = await res.Body.transformToByteArray();
    return { data: buf, contentType: res.ContentType ?? "" };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw err;
  }
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // Best-effort: daca obiectul nu exista sau stergerea esuiaza, nu blocam
    // fluxul principal (de ex. stergerea unui examen din DB).
  }
}

// URL-ul public (custom domain) al unui obiect din bucket-ul public.
export function publicUrl(key: string): string {
  return `${publicBaseUrl()}/${key}`;
}