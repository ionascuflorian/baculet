"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { Loader2, FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  TestAiResult,
  TestAiSettingsArgs,
  TestAiProvider,
} from "@/lib/actions/admin";

type TestAction = (input: TestAiSettingsArgs) => Promise<TestAiResult>;

export function AiTestButton({ testAction }: { testAction: TestAction }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TestAiResult | null>(null);

  async function handleTest(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest("form");
    if (!form) {
      setResult({ ok: false, ms: 0, model: "-", error: "Formularul nu a fost găsit." });
      return;
    }
    const data = new FormData(form);
    setPending(true);
    setResult(null);
    try {
      const res = await testAction({
        provider: String(data.get("provider") ?? "google") as TestAiProvider,
        apiKey: String(data.get("apiKey") ?? "").trim(),
        model: String(data.get("model") ?? "").trim(),
      });
      setResult(res);
    } catch (e) {
      setResult({
        ok: false,
        ms: 0,
        model: "-",
        error: e instanceof Error ? e.message : "Eroare necunoscută.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={handleTest}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <FlaskConical className="h-5 w-5" />}
        {pending ? "Se testează…" : "Testează AI"}
      </Button>
      {result && (
        <div
          className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
            result.ok
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }`}
          role="status"
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>
            {result.ok
              ? `Merge! Răspuns în ${(result.ms / 1000).toFixed(1)}s — model: ${result.model}`
              : `Eroare (${result.model}): ${result.error}`}
          </span>
        </div>
      )}
    </div>
  );
}