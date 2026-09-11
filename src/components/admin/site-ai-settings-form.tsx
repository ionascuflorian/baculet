"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Globe, Trash2 } from "lucide-react";
import {
  saveSiteAiSettings,
  clearSiteAiSettings,
  testSiteAiSettings,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { AiTestButton } from "@/components/admin/ai-test-button";
import {
  AI_PROVIDERS,
  AI_MODEL_SUGGESTIONS,
  isOpenRouter,
  type SuggestableProvider,
} from "@/lib/ai-options";

export function SiteAiSettingsForm({
  provider,
  model,
  hasKey,
  fallback,
}: {
  provider: string | null;
  model: string | null;
  hasKey: boolean;
  fallback: { provider: string; model: string };
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string>(
    AI_PROVIDERS.find((p) => p.id === provider)?.id ?? "google"
  );

  const current = AI_PROVIDERS.find((p) => p.id === selected) ?? AI_PROVIDERS[0];

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const res = await saveSiteAiSettings({
        provider: String(formData.get("provider") ?? "google") as
          | "google"
          | "openai"
          | "anthropic"
          | "openrouter",
        apiKey: String(formData.get("apiKey") ?? "").trim(),
        model: String(formData.get("model") ?? "").trim(),
      });
      if (res?.ok) {
        showToast("Setările AI pentru site au fost salvate.");
        router.refresh();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Eroare la salvare.");
    } finally {
      setPending(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("Sigur vrei să ștergi AI-ul configurat pentru site?")) return;
    setPending(true);
    try {
      await clearSiteAiSettings();
      showToast("AI-ul site-ului a fost resetat la implicit.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-ink">AI folosit pe site (Siera, teme)</p>
            <p className="text-xs font-semibold text-subtle">
              Cheie și model pentru Siera (asistentul elevilor) și generatorul de teme vizuale.
              Cheia este criptată; dacă o ștergi, site-ul revine la cheia și modelul din mediu.
            </p>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="site-provider">Provider</Label>
              <select
                id="site-provider"
                name="provider"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-11 w-full rounded-xl border border-feather bg-card px-4 text-sm font-semibold text-ink"
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="site-apiKey">Cheie API</Label>
              <Input
                id="site-apiKey"
                name="apiKey"
                type="password"
                placeholder={hasKey ? "•••••••• (salvată — introdu alta ca s-o înlocuiești)" : current.placeholder}
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="site-model">
                Model {isOpenRouter(selected) ? "(ID OpenRouter)" : ""}
              </Label>
              <Input
                id="site-model"
                name="model"
                type="text"
                list="site-ai-model-suggestions"
                defaultValue={model ?? ""}
                placeholder={
                  model ?? (isOpenRouter(selected) ? "ex. openai/gpt-4o-mini" : current.modelPlaceholder)
                }
                autoComplete="off"
              />
              <datalist id="site-ai-model-suggestions">
                {(AI_MODEL_SUGGESTIONS[selected as SuggestableProvider] ?? []).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <p className="mt-1 text-[11px] font-semibold text-subtle">
                {isOpenRouter(selected)
                  ? "Alege orice model OpenRouter (ex. openai/gpt-4o, anthropic/claude-3.7-sonnet)."
                  : "Modelul folosit de Siera și generatorul de teme."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-accent/10 px-3 py-2 text-xs font-bold text-accent">
              {hasKey && model
                ? `Model configurat: ${model} (${AI_PROVIDERS.find((p) => p.id === provider)?.label ?? provider})`
                : `Implicit: ${fallback.provider} — ${fallback.model} (din mediu)`}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {pending ? "Se salvează…" : "Salvează setările"}
            </Button>
            <AiTestButton testAction={testSiteAiSettings} />
            {hasKey && (
              <Button type="button" variant="outline" disabled={pending} onClick={handleClear}>
                <Trash2 className="h-5 w-5" /> Șterge
              </Button>
            )}
          </div>

          <p className="text-xs font-semibold text-subtle">
            {hasKey && provider
              ? `Site-ul folosește în prezent AI-ul configurat (${AI_PROVIDERS.find((p) => p.id === provider)?.label ?? provider}). Poți lăsa câmpul de cheie gol — testul și Siera folosesc cheia salvată.`
              : "Nimic configurat: site-ul folosește AI-ul implicit din mediu. Poți lăsa cheia goală pentru Google (folosește cheia din mediu), dar pentru OpenAI/Anthropic/OpenRouter e obligatorie."}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}