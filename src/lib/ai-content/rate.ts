// Rate limiting + buget pentru generările AI Content Studio.
import { consumeBucket, clearBucket } from "@/lib/rate-limit";

// Generări (curriculum / lecție / quiz / checkpoint / validare) per admin / oră.
const CONTENT_GEN_LIMIT = 30;
const CONTENT_GEN_WINDOW_MS = 60 * 60 * 1000;

function genKey(userId: string): string {
  return `ai-content:${userId}`;
}

export async function canGenerate(userId: string): Promise<boolean> {
  return consumeBucket(genKey(userId), CONTENT_GEN_LIMIT, CONTENT_GEN_WINDOW_MS);
}

export async function resetBudget(userId: string): Promise<void> {
  await clearBucket(genKey(userId));
}

// Chat cu Asistentul Content Studio: buget separat ca să nu consume generările.
const ASSISTANT_LIMIT = 60;
const ASSISTANT_WINDOW_MS = 6 * 60 * 60 * 1000;

function assistantKey(userId: string): string {
  return `ai-content-assistant:${userId}`;
}

export async function assistantCanChat(userId: string): Promise<boolean> {
  return consumeBucket(assistantKey(userId), ASSISTANT_LIMIT, ASSISTANT_WINDOW_MS);
}

export const MAX_CONTENT_PROMPT_CHARS = 60000;