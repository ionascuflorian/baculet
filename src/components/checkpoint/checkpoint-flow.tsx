"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, CheckCircle2, XCircle, ArrowRight, Sparkles, RefreshCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitCheckpoint } from "@/lib/actions/checkpoint";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ConfettiBurst } from "@/components/confetti-burst";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  conceptId?: string | null;
  conceptSlug?: string | null;
}

interface Props {
  checkpointSlug: string;
  title: string;
  questions: Question[];
  chapterSlug: string;
  subjectSlug: string;
}

type Phase = "intro" | "playing" | "results";

export function CheckpointFlow({ checkpointSlug, title, questions, chapterSlug, subjectSlug }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<null | { score: number; maxScore: number; pct: number; weakConcepts: { conceptId: string; name: string }[] }>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = questions.length;
  const q = questions[idx];
  const pct = Math.round(((idx + (revealed ? 1 : 0)) / total) * 100);
  const isLast = idx === total - 1;

  function startCheckpoint() {
    setPhase("playing");
  }

  function handleSelect(i: number) {
    if (revealed) return;
    setSelected(i);
  }

  function reveal() {
    if (selected === null) return;
    setRevealed(true);
  }

  function next() {
    if (selected !== null && q) {
      setAnswers((a) => ({ ...a, [q.id]: selected }));
    }
    if (isLast) {
      // submit
      const finalAnswers = selected !== null && q ? { ...answers, [q.id]: selected } : answers;
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

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
          <Target className="h-8 w-8 text-accent" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-accent">CHECKPOINT</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-subtle">Ai terminat primele 4 unități. Acum verificăm cât de bine ai înțeles conceptele.</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 text-left">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>{total} exerciții</span>
            <span>~{Math.ceil(total * 0.8)} minute</span>
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

  if (phase === "playing" && q) {
    const isCorrect = selected === q.correctIndex;
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-ink">Întrebarea {idx + 1} / {total}</span>
            <span className="text-accent">{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <h2 className="text-lg font-extrabold text-ink">{q.text}</h2>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const sel = selected === i;
            const showCorrect = revealed && i === q.correctIndex;
            const showWrong = revealed && sel && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={revealed}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all",
                  !revealed && sel ? "border-accent bg-accent/10 ring-2 ring-accent/20" : !revealed ? "border-feather hover:border-accent/30" : showCorrect ? "border-success bg-success/10" : showWrong ? "border-danger bg-danger/10" : "border-feather opacity-60"
                )}
              >
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold", sel ? "bg-accent text-white" : "bg-ink/5")}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
                {showCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                {showWrong && <XCircle className="ml-auto h-4 w-4 text-danger" />}
              </button>
            );
          })}
        </div>
        {revealed && q.explanation && <p className="rounded-xl bg-accent/10 p-3 text-sm text-ink">💡 {q.explanation}</p>}
        {submitError && (
          <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {submitError}
          </p>
        )}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0}>
            Înapoi
          </Button>
          {!revealed ? (
            <Button size="sm" onClick={reveal} disabled={selected === null}>
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
    // Race: phase a ajuns la "results", dar rezultatul încă se încarcă (sau a eșuat).
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
    const mastered = result.weakConcepts.length === 0;
    const ready = result.pct >= 70 && result.pct < 90;
    const needsPractice = result.pct < 70;

    // determină exerciții stăpânite vs de consolidat (mock: cele corecte vs greșite)
    const masteredConcepts = result.pct >= 90 ? ["Calculul valorii funcției", "Identificarea funcțiilor"] : result.pct >= 70 ? ["Baze"] : [];
    const weakNames = result.weakConcepts.map((w) => w.name);

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
          <p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-accent">🎯 CHECKPOINT FINALIZAT</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">
            {result.score} / {result.maxScore}
          </p>
          <div className="mx-auto mt-2 h-2 w-40 overflow-hidden rounded-full bg-feather">
            <div className="h-full bg-accent" style={{ width: `${result.pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-bold text-ink">
            {result.pct >= 90 ? "Excelent! Ai stăpânit această etapă." : result.pct >= 70 ? "Ai înțeles baza. Mai avem câteva lucruri de consolidat." : "Mai avem câteva concepte importante de consolidat."}
          </p>
          <p className="text-xs text-subtle">{result.pct >= 90 ? "Următoarea unitate s-a deblocat." : result.pct >= 70 ? "Poți continua, dar îți recomandăm un review scurt." : "Îți recomandăm o sesiune de review înainte să continui."}</p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
            <p className="text-sm font-extrabold text-success">Ai stăpânit</p>
            {masteredConcepts.length > 0 ? (
              masteredConcepts.map((m) => (
                <p key={m} className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {m}
                </p>
              ))
            ) : (
              <p className="text-sm text-subtle">✓ Concepte cu răspunsuri corecte</p>
            )}
          </div>
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
            <p className="text-sm font-extrabold text-warning">Mai avem de consolidat</p>
            {weakNames.length > 0 ? (
              weakNames.map((w) => (
                <p key={w} className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <span className="text-warning">⚠️</span> {w}
                </p>
              ))
            ) : (
              <p className="text-sm text-subtle">— niciunul, bravo!</p>
            )}
          </div>
        </div>

        {result.pct >= 90 && (
          <div className="flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href={`/materii/${subjectSlug}`}>Continuă →</Link>
            </Button>
            <ConfettiBurst pieces={30} />
          </div>
        )}
        {ready && (
          <div className="flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href={`/materii/${subjectSlug}`}>Continuă</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/recapitulare?checkpoint=${checkpointSlug}`}>Exersează recomandarea</Link>
            </Button>
          </div>
        )}
        {needsPractice && (
          <div className="flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href={`/recapitulare?checkpoint=${checkpointSlug}`}>Începe sesiunea de review</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/checkpoint/${checkpointSlug}`}>Vezi ce trebuie să exersezi</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/materii/${subjectSlug}`}>Continuă oricum</Link>
            </Button>
          </div>
        )}

        <div className="rounded-xl bg-feather/30 p-3 text-xs text-subtle">
          Mastery actualizat pentru {result.weakConcepts.length} concepte slabe. Următoarea unitate e deja disponibilă — checkpoint-ul rămâne cu statusul "{needsPractice ? "de revizuit" : "finalizat"}" în traseu.
        </div>
      </div>
    );
  }

  return null;
}
