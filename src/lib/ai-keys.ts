import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function key(): Buffer {
  const secret = process.env.AUTH_SECRET ?? process.env.CRON_SECRET ?? "baculet-dev-secret";
  return createHash("sha256").update(secret).digest();
}

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptApiKey(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Cheie AI stocată invalid.");
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

export function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}