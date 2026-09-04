"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, KeyRound, Trash2 } from "lucide-react";
import { saveAiSettings, clearAiSettings } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const PROVIDERS = [
  { id: "google", label: "Google (Gemini)", placeholder: "AIza..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
] as const;

export function AiSettingsForm({
  provider,
  hasKey,
}: {
  provider: string | null;
  hasKey: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  const current = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const res = await saveAiSettings({
        provider: String(formData.get("provider") ?? "google") as "google" | "openai" | "anthropic",
        apiKey: String(formData.get("apiKey") ?? "").trim(),
      });
      if (res?.ok) {
        showToast("Cheia AI a fost salvată.");
        router.refresh();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Eroare la salvare.");
    } finally {
      setPending(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("Sigur vrei să ștergi cheia AI salvată?")) return;
    setPending(true);
    try {
      await clearAiSettings();
      showToast("Cheia AI a fost ștearsă.");
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
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-ink">Cheia ta de AI</p>
            <p className="text-xs font-semibold text-subtle">
              Folosită doar pentru generarea exercițiilor; criptată în baza de date.
            </p>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                name="provider"
                defaultValue={current.id}
                className="h-11 w-full rounded-xl border border-feather bg-card px-4 text-sm font-semibold text-ink"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="apiKey">Cheie API</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder={hasKey ? "•••••••• (salvată — introdu alta ca să o înlocuiești)" : current.placeholder}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {pending ? "Se salvează…" : "Salvează cheia"}
            </Button>
            {hasKey && (
              <Button type="button" variant="outline" disabled={pending} onClick={handleClear}>
                <Trash2 className="h-5 w-5" /> Șterge
              </Button>
            )}
          </div>

          <p className="text-xs font-semibold text-subtle">
            {hasKey && provider
              ? `Ai o cheie ${PROVIDERS.find((p) => p.id === provider)?.label ?? provider} salvată.`
              : "Nu ai încă o cheie salvată. Fără cheie, generatorul folosește cheia Google din mediu (dacă e configurată)."}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}