"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Sparkles, Save, Plus, Check } from "lucide-react";
import {
  createSection,
  updateSection,
  createQuickQuiz,
} from "@/lib/actions/admin";
import { LessonEditor } from "@/components/admin/lesson-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import {
  KIND_META,
  sectionKind,
  type QuizOptionDto,
  type SectionDto,
  type SectionKind,
} from "@/components/admin/section-types";

const GEN_STAGES = [
  "Se pregătește conținutul lecției…",
  "Se analizează materialul…",
  "Se construiesc exercițiile…",
  "Se verifică răspunsurile…",
];

interface DraftQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type: string;
}

function emptyQuestion(): DraftQuestion {
  return { text: "", options: ["", "", "", ""], correctIndex: 0, explanation: "", type: "SINGLE" };
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  subjectName: string;
  lessonContent: string;
  section: SectionDto | null;
  quizzes: QuizOptionDto[];
  onDone: () => void;
}

export function SectionForm({
  lessonId,
  lessonTitle,
  subjectName,
  lessonContent,
  section,
  quizzes,
  onDone,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = section !== null;

  const [kind, setKind] = useState<SectionKind>(section ? sectionKind(section) : "theory");
  const [title, setTitle] = useState(section?.title ?? "");
  const [content, setContent] = useState(isEdit && !section?.quiz ? section.content : "");
  const [minReadTime, setMinReadTime] = useState(section?.minReadTime ?? 15);
  const [exerciseMode, setExerciseMode] = useState<"existing" | "new">("existing");
  const [quizId, setQuizId] = useState(section?.quiz?.id ?? "");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  const stepTypeFor =
    kind === "exercise" ? "EXERSEAZĂ" : kind === "example" ? "VEZI UN EXEMPLU" : section?.stepType || "DESCOPERĂ";

  const availableQuizzes = quizzes.filter((q) => !q.usedByOther);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(questionIndex: number, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.map((o, oi) => (oi === optIndex ? value : o)) }
          : q
      )
    );
  }

  async function generateWithAi() {
    setGenerating(true);
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
          count: 3,
          difficulty: 1,
          types: ["SINGLE"],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { error?: string }).error ?? "Eroare la generare.");
        return;
      }
      const generated = (data as { questions: { text: string; options: string[]; correctIndex: number; explanation: string; type: string }[] }).questions ?? [];
      setQuestions(
        generated.map((q) => {
          const options = [...q.options];
          while (options.length < 4) options.push("");
          return {
            text: q.text,
            options,
            correctIndex: Math.min(q.correctIndex, options.length - 1),
            explanation: q.explanation,
            type: q.type,
          };
        })
      );
      showToast(`${generated.length} exerciții generate — verifică-le și salvează.`);
      setGenProgress(100);
      window.setTimeout(() => setGenProgress(null), 900);
    } catch {
      showToast("Eroare de rețea la generare.");
    } finally {
      if (genTimer.current) {
        window.clearInterval(genTimer.current);
        genTimer.current = null;
      }
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (kind !== "exercise" && !title.trim()) {
      showToast("Adaugă un titlu scurt pentru secțiune.");
      return;
    }
    if (kind !== "exercise" && !content.trim()) {
      showToast("Scrie conținutul secțiunii.");
      return;
    }

    setSaving(true);
    try {
      let sectionQuizId: string | null = null;
      if (kind === "exercise") {
        if (exerciseMode === "existing") {
          if (!quizId) throw new Error("Alege un exercițiu existent.");
          sectionQuizId = quizId;
        } else {
          const clean = questions
            .map((q) => ({
              text: q.text.trim(),
              options: q.options.map((o) => o.trim()).filter(Boolean),
              correctIndex: q.correctIndex,
              explanation: q.explanation.trim(),
              type: q.type as "SINGLE" | "CLOZE" | "FLASHCARD" | "DRAG_DROP",
            }))
            .filter((q) => q.text.length > 0 && q.options.length >= 2);
          if (clean.length === 0) throw new Error("Adaugă cel puțin o întrebare cu 2 variante.");
          const { quizId: newQuizId } = await createQuickQuiz(lessonId, {
            title: title.trim() || "Exercițiu",
            questions: clean,
          });
          sectionQuizId = newQuizId;
        }
      }

      const payload = {
        title: title.trim() || null,
        content: kind === "exercise" ? "" : content,
        stepType: stepTypeFor,
        minReadTime,
        quizId: sectionQuizId,
      };

      if (isEdit && section) {
        await updateSection(section.id, lessonId, payload);
      } else {
        await createSection(lessonId, payload);
      }

      showToast(isEdit ? "Secțiunea a fost actualizată." : "Secțiunea a fost adăugată.");
      router.refresh();
      onDone();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Eroare la salvare.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-feather">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">
            {isEdit ? "Editează secțiunea" : "Adaugă secțiune nouă"}
          </h3>
          <button
            type="button"
            onClick={onDone}
            className="rounded-full p-1.5 text-subtle hover:bg-feather"
            aria-label="Închide formularul"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <Label>Tipul secțiunii</Label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {(Object.keys(KIND_META) as SectionKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                  kind === k
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-feather text-subtle hover:border-accent/40"
                }`}
              >
                {KIND_META[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Titlu scurt</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pasul 1: Definirea conceptului"
            />
          </div>
          {(kind === "theory" || kind === "example") && (
            <div>
              <Label>Timp minim de citire (secunde)</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={minReadTime}
                onChange={(e) => setMinReadTime(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        {kind === "theory" || kind === "example" ? (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label>Conținut (scurt, ideal sub 500 caractere)</Label>
              <span
                className={`text-xs font-bold ${content.length > 500 ? "text-danger" : "text-subtle"}`}
              >
                {content.length} caractere
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl">
              <LessonEditor initialMarkdown={content} onChange={setContent} />
            </div>
          </div>
        ) : (
          <div>
            <Label>Exercițiu pentru această secțiune</Label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setExerciseMode("existing")}
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                  exerciseMode === "existing"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-feather text-subtle"
                }`}
              >
                Folosește unul existent
              </button>
              <button
                type="button"
                onClick={() => setExerciseMode("new")}
                className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${
                  exerciseMode === "new"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-feather text-subtle"
                }`}
              >
                Creează exercițiu nou
              </button>
            </div>

            {exerciseMode === "existing" ? (
              <div className="mt-3">
                {availableQuizzes.length === 0 ? (
                  <p className="rounded-xl bg-feather/40 px-3 py-2 text-sm font-semibold text-subtle">
                    Nu există exerciții disponibile la această materie. Creează unul nou.
                  </p>
                ) : (
                  <select
                    value={quizId}
                    onChange={(e) => setQuizId(e.target.value)}
                    className="h-11 w-full rounded-xl border border-feather bg-card px-4 text-sm font-semibold text-ink"
                  >
                    <option value="">— Alege un exercițiu —</option>
                    {availableQuizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({q.questionCount} întrebări{q.difficulty === 1 ? " · ușor" : q.difficulty === 3 ? " · greu" : " · mediu"})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold text-ink">Întrebări</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={generating}
                      onClick={generateWithAi}
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {generating ? "Se generează…" : "Generează cu AI"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
                    >
                      <Plus className="h-4 w-4" /> Întrebare
                    </Button>
                  </div>
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
                      Durează de obicei 10–30 de secunde. Întrebările apar aici când e gata.
                    </p>
                  </div>
                )}

                {questions.map((q, qi) => (
                  <Card key={qi} className="border-feather">
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-extrabold text-accent">
                          Întrebarea {qi + 1}
                        </span>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                            className="rounded-full p-1 text-subtle hover:bg-feather"
                            aria-label="Șterge întrebarea"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <Textarea
                        value={q.text}
                        onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                        rows={2}
                        placeholder="Textul întrebării"
                      />
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateQuestion(qi, { correctIndex: oi })}
                              className="flex items-center gap-1.5 text-xs font-bold text-subtle"
                              title="Marchează varianta corectă"
                            >
                              {q.correctIndex === oi ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <span className="inline-block h-4 w-4 rounded-full border border-feather" />
                              )}
                              corect
                            </button>
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`Varianta ${oi + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      <Textarea
                        value={q.explanation}
                        onChange={(e) => updateQuestion(qi, { explanation: e.target.value })}
                        rows={1}
                        placeholder="Explicație (opțional)"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onDone}>
            Anulează
          </Button>
          <Button type="button" disabled={saving} onClick={handleSave}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Se salvează…" : isEdit ? "Salvează modificările" : "Adaugă secțiunea"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}