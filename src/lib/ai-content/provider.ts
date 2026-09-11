import { createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { currentUser, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/db";
import { decryptApiKey } from "@/lib/ai-keys";
import {
  buildLanguageModel,
  type AiProviderName,
} from "@/lib/ai-model";
import type { EmbeddingModel, LanguageModel } from "ai";

export type ContentProviderName = AiProviderName;

export interface StudioModel {
  provider: ContentProviderName;
  model: LanguageModel;
  embedding: EmbeddingModel;
}

export const DEFAULT_MODELS: Record<ContentProviderName, string> = {
  google: "gemini-3.5-flash-lite",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  openrouter: "openai/gpt-4o-mini",
};

// Rezolvă providerul+cheia+modelul adminului (același pattern ca generate-exercises).
// Embeddingurile folosesc același provider ca generarea, cu un fallback pe Google.
export async function resolveStudioModel(): Promise<StudioModel> {
  const sessionUser = await currentUser();
  if (!sessionUser || !hasPermission(sessionUser, "MANAGE_AI_CONTENT")) {
    throw new Error("Neautorizat");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { aiProvider: true, aiApiKeyEnc: true, aiModel: true },
  });

  let provider: ContentProviderName = "google";
  if (
    dbUser?.aiProvider === "openai" ||
    dbUser?.aiProvider === "anthropic" ||
    dbUser?.aiProvider === "openrouter"
  ) {
    provider = dbUser.aiProvider;
  }

  let apiKey: string | null = null;
  if (dbUser?.aiApiKeyEnc) {
    try {
      apiKey = decryptApiKey(dbUser.aiApiKeyEnc);
    } catch {
      apiKey = null;
    }
  }
  if (!apiKey && provider !== "google") {
    throw new Error(
      "Configurează o cheie AI în Setări AI (panou admin) pentru a folosi providerul ales."
    );
  }
  if (!apiKey) apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";

  const chosenModel = dbUser?.aiModel?.trim() || null;
  const envModel =
    provider === "openrouter"
      ? process.env.OPENROUTER_MODEL
      : provider === "openai"
        ? process.env.OPENAI_CONTENT_MODEL
        : provider === "anthropic"
          ? process.env.ANTHROPIC_CONTENT_MODEL
          : process.env.SIERA_MODEL;

  const modelId = chosenModel ?? envModel ?? DEFAULT_MODELS[provider];

  let model: LanguageModel;
  let embedding: EmbeddingModel;
  switch (provider) {
    case "openai":
      model = buildLanguageModel(provider, apiKey, modelId);
      embedding = createOpenAI({ apiKey }).textEmbeddingModel(
        process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"
      );
      break;
    case "openrouter":
    case "anthropic":
    case "google":
    default:
      model = buildLanguageModel(provider, apiKey, modelId);
      embedding = google.textEmbeddingModel("text-embedding-004");
      break;
  }

  return { provider, model, embedding };
}

export async function requireAdminOrThrow(): Promise<string> {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    throw new Error("Neautorizat");
  }
  return user.id;
}