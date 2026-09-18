"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitCheckpoint, type CheckpointResult } from "@/lib/actions/checkpoint";
import { normalizeQuestion, parseUserAnswer, checkAnswer, type Exercise } from "@/lib/lesson/exercise-schema";
import { ExerciseInput } from "@/components/lesson/exercise-input";
import { ExerciseFeedback } from "@/components/lesson/exercise-feedback";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ConfettiBurst } from "@/components/confetti-burst";

interface Question {
  id: string;
  text: string;
  options: unknown;
  correctIndex: number;
  answer?: unknown;
  explanation?: string | null;
  type: string;
  difficulty?: number;
  conceptId?: string | null;
  conceptSlug?: string | null;
  conceptName?: string | null;
}

interface Props {
  checkpointSlug: string;
  title: string;
  questions: Question[];
  chapterSlug: string;
  subjectSlug: string;
}

type Phase = "intro" | "playing" | "results";

function hasAnswer(kind: Exercise["kind"], value: unknown): boolean {
  if (value === null || value === undefined) return false;
  switch (kind) {
    case "fill_blank":
      return typeof value === "string" && value.trim().length > 0;
    case "multiple":
      return Array.isArray(value) && value.length > 0;
    case "matching":
      return Array.isArray(value) && value.length > 0;
    case "ordering":
      return Array.isArray(value) && value.length > 0;
    case "classification":
      return typeof value === "object" && value !== null && Object.keys(value as Record<string, unknown>).length > 0;
    default:
      return true;
  }
}

export function CheckpointFlow({ checkpointSlug, title, questions, chapterSlug, subjectSlug }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<unknown | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<CheckpointResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = questions.length;
  const q = questions[idx];
  const exercise = useMemo(
    () =>
      q
        ? normalizeQuestion({
            id: q.id,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            answer: q.answer,
            explanation: q.explanation,
            type: q.type,
            difficulty: q.difficulty,
            conceptId: q.conceptId,
            concept: q.conceptName ?? q.conceptSlug ?? null,
          })
        : null,
    [q]
  );
  const pct = Math.round(((idx + (revealed ? 1 : 0)) / Math.max(total, 1)) * 100);
  const isLast = idx === total - 1;

  function startCheckpoint() {
    setPhase("playing");
  }

  function reveal() {
    if (!exercise || !hasAnswer(exercise.kind, selected)) return;
    setRevealed(true);
  }

  function next() {
    if (!q || selected === undefined) return;
    const finalAnswers = { ...answers, [q.id]: selected };
    setAnswers(finalAnswers);
    if (isLast) {
      start(async () => {
        try {
          const res = await submitCheckpoint(checkpointSlug, finalAnswers);
          setResult(res);
          setPhase("results");
        } catch (e) {
          console.error(e);
          setSubmitError("Nu am putut trimite răspunsurile. Încearcă din nou.");
        }
      });
    } else {
      setRevealed(false);
      setSelected(answers[questions[idx + 1]?.id] ?? null);
      setIdx((i) => i + 1);
    }
  }

  const goBack = () => {
    if (idx === 0) return;
    setIdx((i) => i - 1);
    const prev = questions[idx - 1];
    setSelected(prev ? (answers[prev.id] ?? null) : null);
    setRevealed(false);
  };

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
          <Target className="h-8 w-8 text-accent" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-accent">CHECKPOINT</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-subtle">Verificăm cât de bine ai înțeles conceptele parcurse în această etapă.</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 text-left">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{total} exerciții</span>
            <span>~{Math.ceil(Math.max(total, 1) * 0.8)} minute</span>
          </div>
          <div className="mt-2 text-xs text-subtle">• Concepte grupate • Feedback imediat • Review personalizat după</div>
        </div>
        <Button size="lg" className="w-full" onClick={startCheckpoint}>
          Începe checkpoint-ul <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="text-xs text-subtle">Distinct de lecții — aici demonstrezi ce ai învățat.</p>
      </div>
    );
  }

  if (phase === "playing" && q && exercise) {
    const localCorrect = checkAnswer(exercise, parseUserAnswer(exercise.kind, selected as never));
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-ink">Întrebarea {idx + 1} / {total}</span>
            <span className="text-accent">{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-accent">
            {q.conceptName ?? "Checkpoint"}
          </span>
        </div>
        <h2 className="text-lg font-extrabold text-ink">{q.text}</h2>
        <ExerciseInput exercise={exercise} value={selected ?? null} onChange={setSelected} disabled={revealed} />
        {revealed && <ExerciseFeedback correct={localCorrect} explanation={q.explanation} />}
        {submitError && (
          <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">{submitError}</p>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={goBack} disabled={idx === 0}>
            Înapoi
          </Button>
          {!revealed ? (
            <Button size="sm" onClick={reveal} disabled={!hasAnswer(exercise.kind, selected)}>
              Verifică
            </Button>
          ) : (
            <Button size="sm" onClick={next} disabled={pending}>
              {isLast ? (pending ? "Se trimite..." : "Vezi rezultatele") : "Următoarea"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "results" && !result) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <p className="text-sm font-semibold text-ink">Se calculează rezultatele…</p>
        {submitError && (
          <div>
            <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">{submitError}</p>
            <Button size="sm" className="mt-3" onClick={() => { setSubmitError(null); setPhase("playing"); }}>
              Încearcă din nou
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "results" && result) {
    const excellent = result.pct >= 90;
    const ready = result.pct >= 70 && result.pct < 90;
    const needsPractice = result.pct < 70;
    const na = result.nextAction;

    return (
      <div className="mx-auto max-w-xl space-y-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border bg-card p-6 text-center"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Target className="h-6 w-6 text-accent" />
          </div>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-accent">CHECKPOINT FINALIZAT</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">
            {result.score} / {result.maxScore}
          </p>
          <div className="mx-auto mt-2 h-2 w-40 overflow-hidden rounded-full bg-feather">
            <div className="h-full bg-accent" style={{ width: `${result.pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-bold text-ink">
            {excellent ? "Excelent! Ai stăpânit această etapă." : ready ? "Ai înțeles baza. Mai avem câteva lucruri de consolidat." : "Mai avem câteva concepte importante de consolidat."}
          </p>
          <p className="text-xs text-subtle">{na.description}</p>
        </motion.div>

        {(result.masteredConcepts.length > 0 || result.weakConcepts.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {result.masteredConcepts.length > 0 && (
              <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
                <p className="text-sm font-extrabold text-success">Ai stăpânit</p>
                {result.masteredConcepts.map((m) => (
                  <p key={m.conceptId} className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <CheckCircle2 className="h-4 w-4 text-success" /> {m.name}
                  </p>
                ))}
              </div>
            )}
            <div className={cn("rounded-2xl border p-4", result.weakConcepts.length > 0 ? "border-warning/20 bg-warning/5" : "border-success/20 bg-success/5")}>
              <p className={cn("text-sm font-extrabold", result.weakConcepts.length > 0 ? "text-warning" : "text-success")}>
                {result.weakConcepts.length > 0 ? "Mai avem de consolidat" : "Nimic de consolidat"}
              </p>
              {result.weakConcepts.length > 0 ? (
                result.weakConcepts.map((w) => (
                  <p key={w.conceptId} className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <span className="text-warning">⚠️</span> {w.name}
                  </p>
                ))
              ) : (
                <p className="text-sm text-subtle">— niciunul, bravo!</p>
              )}
            </div>
          </div>
        )}

        {(excellent || ready) && (
          <div className="flex flex-col gap-2">
            {na.href && (
              <Button asChild size="lg" className="w-full">
                <Link href={na.href}>{na.title} <ArrowRight className="h-5 w-5" /></Link>
              </Button>
            )}
            {(excellent || (ready && result.weakConcepts.length > 0)) && (
              <Button asChild variant="outline">
                <Link href="/recapitulare">Exersează recomandarea</Link>
              </Button>
            )}
          </div>
        )}
        {excellent && <ConfettiBurst pieces={30} />}
        {needsPractice && (
          <div className="flex flex-col gap-2">
            {na.href && (
              <Button asChild size="lg" className="w-full">
                <Link href={na.href}>{na.title} <ArrowRight className="h-5 w-5" /></Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/materii/${subjectSlug}/${chapterSlug}`}>Continuă oricum</Link>
            </Button>
          </div>
        )}

        <div className="rounded-xl bg-feather/30 p-3 text-xs text-subtle">
          Mastery actualizat pentru {result.weakConcepts.length} concepte de consolidat. {needsPractice ? "Checkpoint-ul rămâne „de revizuit” până trece pragul de 70%." : "Următoarea unitate e disponibilă în traseu."}
        </div>
      </div>
    );
  }

  return null;
}