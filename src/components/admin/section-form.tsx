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
import { KIND_LABEL } from "@/lib/lesson/exercise-schema";
import {
  KIND_META,
  STEP_TYPE_FOR_KIND,
  sectionKind,
  type QuizOptionDto,
  type SectionDto,
  type SectionKind,
} from "@/components/admin/section-types";

// Tipurile de exercițiu care se pot crea direct din Constructor.
const QUICK_QUESTION_TYPES = [
  "SINGLE_CHOICE",
  "TRUE_FALSE",
  "MULTIPLE_CHOICE",
  "FILL_BLANK",
  "ORDERING",
] as const;
type QuickQuestionType = (typeof QUICK_QUESTION_TYPES)[number];

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
  multipleIndices: number[];
  explanation: string;
  type: string;
  answer?: unknown;
  acceptedText: string;
  orderingText: string;
}

function emptyQuestion(type = "SINGLE_CHOICE" as string): DraftQuestion {
  const isTrueFalse = type === "TRUE_FALSE";
  return {
    text: "",
    options: isTrueFalse ? ["Adevărat", "Fals"] : ["", "", "", ""],
    correctIndex: 0,
    multipleIndices: [],
    explanation: "",
    type,
    answer: undefined,
    acceptedText: "",
    orderingText: "",
  };
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
    kind !== "theory" ? STEP_TYPE_FOR_KIND[kind] : section?.stepType || STEP_TYPE_FOR_KIND.theory;

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

  function setQuestionType(qi: number, type: string) {
    const normalized = type === "SINGLE" ? "SINGLE_CHOICE" : type;
    const isTrueFalse = normalized === "TRUE_FALSE";
    const current = questions[qi];
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qi
          ? {
              ...q,
              type: normalized,
              options: isTrueFalse
                ? ["Adevărat", "Fals"]
                : normalized === "MULTIPLE_CHOICE" || normalized === "SINGLE_CHOICE"
                  ? q.options.length < 2
                    ? ["", "", "", ""]
                    : q.options
                  : q.options,
              correctIndex: q.correctIndex >= (isTrueFalse ? 2 : Math.max(q.options.length, 1)) ? 0 : q.correctIndex,
              multipleIndices: normalized === "MULTIPLE_CHOICE" ? q.multipleIndices : [],
              answer: normalized === "SINGLE_CHOICE" || normalized === "TRUE_FALSE" ? undefined : q.answer,
            }
          : q
      )
    );
    if (current && current.options.length === 0 && (normalized === "MULTIPLE_CHOICE" || normalized === "SINGLE_CHOICE")) {
      updateOption(qi, 0, "");
    }
  }

  function buildPayload(q: DraftQuestion) {
    const text = q.text.trim();
    let options: string[];
    let type: QuickQuestionType;
    let answer: unknown;

    switch (q.type) {
      case "TRUE_FALSE":
        options = ["Adevărat", "Fals"];
        type = "TRUE_FALSE";
        answer = undefined;
        break;
      case "MULTIPLE_CHOICE": {
        options = q.options.map((o) => o.trim()).filter(Boolean);
        type = "MULTIPLE_CHOICE";
        answer = { kind: "multiple", indices: q.multipleIndices };
        break;
      }
      case "FILL_BLANK": {
        const accepted = (q.acceptedText ?? "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        options = ["—", "—"];
        type = "FILL_BLANK";
        answer = { kind: "fill_blank", accepted };
        break;
      }
      case "ORDERING": {
        options = (q.orderingText ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        type = "ORDERING";
        answer = { kind: "ordering", order: options.map((_, i) => i) };
        break;
      }
      default: {
        options = q.options.map((o) => o.trim()).filter(Boolean);
        type = "SINGLE_CHOICE";
        answer = undefined;
      }
    }

    return {
      text,
      options,
      correctIndex: Math.min(q.correctIndex, Math.max(options.length - 1, 0)),
      explanation: q.explanation.trim(),
      type,
      ...(answer !== undefined ? { answer } : {}),
    };
  }

  function validatePayloads(payloads: ReturnType<typeof buildPayload>[]) {
    for (const p of payloads) {
      if (p.type === "FILL_BLANK") {
        const accepted = (p.answer as { kind: string; accepted?: string[] })?.accepted ?? [];
        if (accepted.length === 0) throw new Error("La „Completează” adaugă măcar un răspuns acceptat.");
        continue;
      }
      if (p.type === "MULTIPLE_CHOICE" && (!Array.isArray(p.answer) || (p.answer as { indices?: number[] }).indices?.length === 0)) {
        throw new Error("La „Alege toate răspunsurile” marchează cel puțin o variantă corectă.");
      }
      if (p.options.length < 2) throw new Error("Adaugă cel puțin 2 variante.");
    }
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
          types: ["SINGLE_CHOICE"],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast((data as { error?: string }).error ?? "Eroare la generare.");
        return;
      }
      const generated = (data as { questions: { text: string; options: string[]; correctIndex: number; explanation: string; type?: string }[] }).questions ?? [];
      setQuestions(
        generated.map((q) => {
          const options = [...q.options];
          while (options.length < 4) options.push("");
          return {
            ...emptyQuestion(q.type ?? "SINGLE_CHOICE"),
            text: q.text,
            options,
            correctIndex: Math.min(q.correctIndex, options.length - 1),
            explanation: q.explanation,
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
            .map(buildPayload)
            .filter((q) => q.text.length > 0);
          validatePayloads(clean);
          if (clean.length === 0) throw new Error("Adaugă cel puțin o întrebare.");
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
                  <QuestionEditor
                    key={qi}
                    q={q}
                    index={qi}
                    total={questions.length}
                    onChange={(patch) => updateQuestion(qi, patch)}
                    onOptionChange={(oi, v) => updateOption(qi, oi, v)}
                    onTypeChange={(t) => setQuestionType(qi, t)}
                    onRemove={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                  />
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

function QuestionEditor({
  q,
  index,
  total,
  onChange,
  onOptionChange,
  onTypeChange,
  onRemove,
}: {
  q: DraftQuestion;
  index: number;
  total: number;
  onChange: (patch: Partial<DraftQuestion>) => void;
  onOptionChange: (optIndex: number, value: string) => void;
  onTypeChange: (type: string) => void;
  onRemove: () => void;
}) {
  const type = q.type === "SINGLE" ? "SINGLE_CHOICE" : q.type;
  const isTrueFalse = type === "TRUE_FALSE";
  const isMultiple = type === "MULTIPLE_CHOICE";
  const isFillBlank = type === "FILL_BLANK";
  const isOrdering = type === "ORDERING";

  return (
    <Card className="border-feather">
      <CardContent className="space-y-2.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-extrabold text-accent">
            Întrebarea {index + 1}
          </span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-subtle">
              <span>Tip:</span>
              <select
                value={type}
                onChange={(e) => onTypeChange(e.target.value)}
                className="h-8 rounded-lg border border-feather bg-card px-2 text-xs font-semibold text-ink"
              >
                {QUICK_QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {KIND_LABEL[t === "SINGLE_CHOICE" ? "single" : t === "TRUE_FALSE" ? "true_false" : t === "MULTIPLE_CHOICE" ? "multiple" : t === "FILL_BLANK" ? "fill_blank" : "ordering"]}
                  </option>
                ))}
              </select>
            </label>
            {total > 1 && (
              <button
                type="button"
                onClick={onRemove}
                className="rounded-full p-1 text-subtle hover:bg-feather"
                aria-label="Șterge întrebarea"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <Textarea
          value={q.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={2}
          placeholder="Textul întrebării"
        />

        {isTrueFalse && (
          <div className="flex gap-2">
            {["Adevărat", "Fals"].map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ correctIndex: i })}
                className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                  q.correctIndex === i
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-feather text-subtle hover:border-accent/40"
                }`}
              >
                {i === 0 ? "✓ Adevărat" : "✗ Fals"} {q.correctIndex === i && "· corect"}
              </button>
            ))}
          </div>
        )}

        {!isTrueFalse && !isFillBlank && !isOrdering && (
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2 rounded-lg border border-feather/70 px-2 py-1.5">
                {!isMultiple ? (
                  <button
                    type="button"
                    onClick={() => onChange({ correctIndex: oi })}
                    className="flex items-center gap-1.5 text-xs font-bold text-subtle"
                    title="Marchează varianta corectă"
                  >
                    {q.correctIndex === oi ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full border border-feather" />
                    )}
                    <span className="hidden sm:inline">corect</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const has = q.multipleIndices.includes(oi);
                      onChange({
                        multipleIndices: has
                          ? q.multipleIndices.filter((x) => x !== oi)
                          : [...q.multipleIndices, oi],
                      });
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-md border-2 text-[10px] font-extrabold"
                    title="Marchează corect"
                  >
                    {q.multipleIndices.includes(oi) ? <Check className="h-3.5 w-3.5 text-success" /> : null}
                  </button>
                )}
                <Input
                  value={opt}
                  onChange={(e) => onOptionChange(oi, e.target.value)}
                  placeholder={`Varianta ${oi + 1}`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => onOptionChange(q.options.length, "")}
              className="text-xs font-bold text-subtle hover:text-accent"
            >
              + Adaugă varianta {q.options.length + 1}
            </button>
          </div>
        )}

        {isFillBlank && (
          <div>
            <Label>Răspuns corect</Label>
            <Input
              value={q.acceptedText}
              onChange={(e) => onChange({ acceptedText: e.target.value })}
              placeholder="rădăcină | soluție"
            />
            <p className="mt-1 text-[11px] font-semibold text-subtle">
              Separă variantele acceptate cu <b>|</b>. Normalizăm automat (fără diacritice).
            </p>
          </div>
        )}

        {isOrdering && (
          <div>
            <Label>Pașii în ordinea CORECTĂ (unul pe linie)</Label>
            <Textarea
              value={q.orderingText}
              onChange={(e) => onChange({ orderingText: e.target.value })}
              rows={4}
              placeholder={'f(x) = ax + b\na = 0\n...'}
            />
            <p className="mt-1 text-[11px] font-semibold text-subtle">
              Elevul îi va pune în ordine. Ordinea în care scrii acum răspunsurile = cea corectă.
            </p>
          </div>
        )}

        <Textarea
          value={q.explanation}
          onChange={(e) => onChange({ explanation: e.target.value })}
          rows={1}
          placeholder="Explicație (opțional)"
        />
      </CardContent>
    </Card>
  );
}