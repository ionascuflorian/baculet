import { prisma } from "@/lib/db";
import { decryptApiKey } from "@/lib/ai-keys";
import {
  buildLanguageModel,
  type AiProviderName,
} from "@/lib/ai-model";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export const SITE_AI_SETTING_KEY = "siteAiConfig";

const FALLBACK_MODEL = process.env.SIERA_MODEL || "gemini-3.5-flash-lite";

export interface SiteAiConfig {
  provider: AiProviderName;
  apiKey: string;
  model: string;
}

export interface SiteAiInfo {
  configured: boolean;
  provider?: AiProviderName;
  model?: string;
  fallback: { provider: AiProviderName; model: string };
}

export interface ResolvedSiteAi {
  model: LanguageModel;
  source: "config" | "default";
}

// Citește configul de AI salvat pentru site (cheie criptată în SiteSetting).
// Returnează null dacă lipsește sau este invalid.
export async function readSiteAiConfig(): Promise<SiteAiConfig | null> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SITE_AI_SETTING_KEY },
    });
    if (!setting?.value || typeof setting.value !== "object") return null;

    const v = setting.value as Record<string, unknown>;
    const provider = v.provider;
    const apiKeyEnc = v.apiKeyEnc;
    const model = v.model;

    if (
      (provider === "google" ||
        provider === "openai" ||
        provider === "anthropic" ||
        provider === "openrouter") &&
      typeof apiKeyEnc === "string" &&
      typeof model === "string" &&
      model.trim()
    ) {
      let apiKey: string;
      try {
        apiKey = decryptApiKey(apiKeyEnc);
      } catch {
        return null;
      }
      if (!apiKey.trim()) return null;
      return {
        provider,
        apiKey,
        model: model.trim(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

// Rezolvă modelul folosit de Siera și generatorul de teme: configul din panou
// dacă există, altfel default-ul din mediu (Google).
export async function resolveSiteModel(): Promise<ResolvedSiteAi> {
  const config = await readSiteAiConfig();
  if (config) {
    return {
      model: buildLanguageModel(config.provider, config.apiKey, config.model),
      source: "config",
    };
  }

  // Default-ul din mediu (Google) rămâne fallback: cheia și modelul sunt citite de
  // instanța `google()` direct din variabilele de mediu.
  return {
    model: google(FALLBACK_MODEL),
    source: "default",
  };
}

// Info pentru pagina de Setări AI (ce e configurat vs implicit).
export async function getSiteAiInfo(): Promise<SiteAiInfo> {
  const config = await readSiteAiConfig();
  return {
    configured: Boolean(config),
    provider: config?.provider ?? undefined,
    model: config?.model ?? undefined,
    fallback: { provider: "google", model: FALLBACK_MODEL },
  };
}