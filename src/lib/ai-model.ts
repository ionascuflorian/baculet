import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { LanguageModel } from "ai";

export type AiProviderName = "google" | "openai" | "anthropic" | "openrouter";

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Construiește un model de limbaj pentru providerul ales. Cheia este deja
// rezolvată de apelant (config salvat sau cheia din mediu).
export function buildLanguageModel(
  provider: AiProviderName,
  apiKey: string,
  modelId: string
): LanguageModel {
  switch (provider) {
    case "openrouter":
      return createOpenAI({ apiKey, baseURL: OPENROUTER_BASE_URL })(modelId);
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
    default:
      return createGoogleGenerativeAI({ apiKey })(modelId);
  }
}

export interface ModelTestResult {
  ok: boolean;
  ms: number;
  error?: string;
}

export async function testLanguageModel(
  model: LanguageModel
): Promise<ModelTestResult> {
  const started = Date.now();
  try {
    await generateText({
      model,
      temperature: 0,
      prompt: "Răspunde doar cu: OK",
      abortSignal: AbortSignal.timeout(30_000),
    });
    return { ok: true, ms: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      ms: Date.now() - started,
      error:
        error instanceof Error
          ? error.message
          : "Eroare necunoscută la apelul către model.",
    };
  }
}