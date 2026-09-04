"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Save, Plus, X, Check } from "lucide-react";
import { saveGeneratedQuestions } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";

const GEN_STAGES = [
  "Se pregătește conținutul lecției…",
  "Se analizează materialul…",
  "Se construiesc exercițiile…",
  "Se verifică răspunsurile…",
];

export interface GeneratedExercise {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type: string;
}

const ALL_TYPES = [
  { id: "SINGLE", label: "Grilă" },
  { id: "CLOZE", label: "Completare" },
  { id: "FLASHCARD", label: "Flashcard" },
  { id: "DRAG_DROP", label: "Ordonare" },
];

export function AiExerciseGenerator({
  path,
  quizId,
  lessonTitle,
  subjectName,
  lessonContent,
  onGenerated,
}: {
  path: string;
  quizId: string;
  lessonTitle: string;
  subjectName: string;
  lessonContent: string;
  onGenerated?: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState({ count: 5, difficulty: 2, types: ["SINGLE"] as string[] });
  const [draft, setDraft] = useState<GeneratedExercise[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [genProgress, setGenProgress] = useState<number | null>(null);
  const genTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (genTimer.current) window.clearInterval(genTimer.current);
    },
    []
  );

  const stageIndex = Math.min(
    GEN_STAGES.length - 1,
    Math.floor((genProgress ?? 0) / (92 / GEN_STAGES.length))
  );

  async function generate() {
    setGenerating(true);
    setError(null);
    setDraft(null);
    setGenProgress(0);
    genTimer.current = window.setInterval(() => {
      setGenProgress((p) => Math.min(92, (p ?? 0) + 1.5 + Math.random() * 3.5));
    }, 300);
    try {
      const res = await fetch("/api/admin/generate-exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonTitle,
          content: lessonContent,
          subjectName,
          count: params.count,
          difficulty: params.difficulty,
          types: params.types,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Eroare la generare.");
        return;
      }
      setDraft((data as { questions: GeneratedExercise[] }).questions ?? []);
      setGenProgress(100);
      window.setTimeout(() => setGenProgress(null), 900);
    } catch {
      setError("Eroare de rețea la generare.");
    } finally {
      if (genTimer.current) {
        window.clearInterval(genTimer.current);
        genTimer.current = null;
      }
      setGenerating(false);
    }
  }

  function toggleType(id: string) {
    setParams((p) => ({
      ...p,
      types: p.types.includes(id)
        ? p.types.length > 1
          ? p.types.filter((t) => t !== id)
          : p.types
        : [...p.types, id],
    }));
  }

  function updateDraft(index: number, patch: Partial<GeneratedExercise>) {
    setDraft((prev) =>
      prev ? prev.map((q, i) => (i === index ? { ...q, ...patch } : q)) : prev
    );
  }

  function updateOption(index: number, optIndex: number, value: string) {
    setDraft((prev) =>
      prev
        ? prev.map((q, i) =>
            i === index
              ? { ...q, options: q.options.map((o, oi) => (oi === optIndex ? value : o)) }
              : q
          )
        : prev
    );
  }

  async function saveAll() {
    if (!draft) return;
    setSaving(true);
    try {
      await saveGeneratedQuestions(
        quizId,
        draft.map((q) => ({
          text: q.text,
          options: q.options.filter((o) => o.trim()),
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          type: q.type as "SINGLE" | "CLOZE" | "FLASHCARD" | "DRAG_DROP",
        })),
        { revalidate: [path] }
      );
      showToast(`${draft.length} exerciții au fost adăugate.`);
      setDraft(null);
      router.refresh();
      onGenerated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Eroare la salvare.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-lg font-bold text-ink">
          <Sparkles className="h-5 w-5 text-accent" /> Generează exerciții cu AI
        </p>
        <Button type="button" variant="accent" size="sm" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? "Se generează…" : "Generează"}
        </Button>
      </div>

      {generating && genProgress !== null && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-accent">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /> {GEN_STAGES[stageIndex]}
            </span>
            <span className="text-ink">{Math.round(genProgress)}%</span>
          </div>
          <Progress value={genProgress} className="mt-2" />
          <p className="mt-2 text-[11px] font-semibold text-subtle">
            Durează de obicei 10–30 de secunde. Lasă pagina deschisă — exercițiile apar aici când e gata.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Număr de exerciții</Label>
          <Input
            type="number"
            min={3}
            max={10}
            value={params.count}
            onChange={(e) => setParams((p) => ({ ...p, count: Number(e.target.value) }))}
          />
        </div>
        <div>
          <Label>Dificultate</Label>
          <select
            value={params.difficulty}
            onChange={(e) => setParams((p) => ({ ...p, difficulty: Number(e.target.value) }))}
            className="h-11 w-full rounded-xl border border-feather bg-card px-4 text-sm font-semibold text-ink"
          >
            <option value={1}>Ușor</option>
            <option value={2}>Mediu</option>
            <option value={3}>Greu</option>
          </select>
        </div>
      </div>

      <div>
        <Label>Tipuri de exerciții</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleType(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                params.types.includes(t.id)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-feather text-subtle hover:border-accent/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">{error}</p>
      )}

      {draft && draft.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-ink">
              {draft.length} exerciții generate — verifică și corectează înainte de salvare
            </p>
            <Button type="button" size="sm" disabled={saving} onClick={saveAll}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Se salvează…" : "Adaugă toate"}
            </Button>
          </div>

          {draft.map((q, qi) => (
            <Card key={qi}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-extrabold text-accent">
                    {ALL_TYPES.find((t) => t.id === q.type)?.label ?? q.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => (prev ? prev.filter((_, i) => i !== qi) : prev))}
                    className="rounded-full p-1 text-subtle hover:bg-feather"
                    aria-label="Șterge exercițiul"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  value={q.text}
                  onChange={(e) => updateDraft(qi, { text: e.target.value })}
                  rows={2}
                />
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateDraft(qi, { correctIndex: oi })}
                        className="flex items-center gap-1.5 text-xs font-bold text-subtle"
                        title="Marchează corect"
                      >
                        {q.correctIndex === oi ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <span className="inline-block h-4 w-4 rounded-full border border-feather" />
                        )}
                        corect
                      </button>
                      <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                    </div>
                  ))}
                </div>
                <Textarea
                  value={q.explanation}
                  onChange={(e) => updateDraft(qi, { explanation: e.target.value })}
                  rows={1}
                  placeholder="Explicație (opțional)"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}