import type { AiProviderName } from "@/lib/ai-model";

export interface AiProviderOption {
  id: AiProviderName;
  label: string;
  placeholder: string;
  modelPlaceholder: string;
}

export type SuggestableProvider = AiProviderName;

export const AI_PROVIDERS: AiProviderOption[] = [
  { id: "google", label: "Google (Gemini)", placeholder: "AIza...", modelPlaceholder: "gemini-3.5-flash-lite" },
  { id: "openai", label: "OpenAI", placeholder: "sk-...", modelPlaceholder: "gpt-4o-mini" },
  { id: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-...", modelPlaceholder: "claude-3-5-haiku-latest" },
  {
    id: "openrouter",
    label: "OpenRouter",
    placeholder: "sk-or-v1-...",
    modelPlaceholder: "openai/gpt-4o-mini",
  },
];

export const AI_MODEL_SUGGESTIONS: Record<AiProviderName, string[]> = {
  google: ["gemini-3.5-flash-lite", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  openai: ["gpt-4o-mini", "gpt-4o", "o3-mini"],
  anthropic: [
    "claude-3-5-haiku-latest",
    "claude-3-5-sonnet-latest",
    "claude-3-7-sonnet-latest",
  ],
  openrouter: [
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "anthropic/claude-3.5-haiku",
    "anthropic/claude-3.7-sonnet",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
  ],
};

export const isOpenRouter = (id: string) => id === "openrouter";