"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { demoQuestions } from "@/components/landing/mock-data";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

const resultMeta = [
  { emoji: "📚", title: "Ai prins gustul!", msg: "Așa arată un test real. Repetă lecția și mai încearcă o dată — vezi cum crești." },
  { emoji: "💪", title: "Un început bun", msg: "Ai văzut exact cum se simte. Cu puțin exercițiu zilnic, scorul urcă repede." },
  { emoji: "👍", title: "Foarte bine!", msg: "Un punct până la perfecțiune. Încă o rundă și ești la maxim." },
  { emoji: "🎉", title: "Perfect!", msg: "Exact așa se simte un 10 la BAC. Ține-o tot așa!" },
];

export function DemoQuiz() {
  const [phase, setPhase] = useState<"intro" | "playing" | "done">("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const total = demoQuestions.length;
  const q = demoQuestions[current];
  const isLast = current === total - 1;
  const answeredCount = Object.keys(answers).length + (locked ? 1 : 0);
  const pct = Math.round((answeredCount / total) * 100);
  const score = demoQuestions.filter(
    (question) => answers[question.id] === question.correct
  ).length;

  function pick(i: number) {
    if (locked) return;
    setAnswers((a) => ({ ...a, [q.id]: i }));
    setSelected(i);
    setLocked(true);
  }

  function goNext() {
    if (isLast) {
      setPhase("done");
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setLocked(false);
    }
  }

  function goBack() {
    const prevQ = demoQuestions[current - 1];
    setSelected(prevQ ? (answers[prevQ.id] ?? null) : null);
    setLocked(!!prevQ && prevQ.id in answers);
    setCurrent((c) => Math.max(c - 1, 0));
  }

  function restart() {
    setPhase("playing");
    setCurrent(0);
    setAnswers({});
    setSelected(null);
    setLocked(false);
  }

  if (phase === "intro") {
    return (
      <div className="surface mx-auto w-full max-w-xl space-y-6 rounded-[2rem] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/10 text-3xl">
          ✍️
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent">
            Demo live
          </p>
          <h3 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
            Test grilă demonstrativ
          </h3>
          <p className="mt-2 text-subtle">
            {total} întrebări grilă din programa de BAC · alege răspunsul și
            primești corectare instant cu explicații.
          </p>
        </div>
        <Button size="lg" onClick={() => setPhase("playing")}>
          <CheckCircle2 className="h-5 w-5" /> Începe testul
        </Button>
      </div>
    );
  }

  if (phase === "done") {
    const meta = resultMeta[Math.min(score, 3)];
    return (
      <div className="surface mx-auto w-full max-w-xl space-y-5 rounded-[2rem] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/10 text-4xl">
          {meta.emoji}
        </div>
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight text-ink">
            {score}/{total}
          </h3>
          <p className="mt-1 text-sm font-bold text-accent">
            {meta.title} · +{score * 10} XP
          </p>
          <p className="mx-auto mt-3 max-w-sm text-subtle">{meta.msg}</p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="outline" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Mai încearcă
          </Button>
          <Button asChild>
            <Link href="/register">
              Începe gratuit <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface mx-auto w-full max-w-xl space-y-5 rounded-[2rem] p-6 sm:p-8">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span className="text-ink">
            Întrebarea {current + 1} din {total}
          </span>
          <span className="text-accent">{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <AnimatePresence mode="wait">
        <motion.h3
          key={q.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="text-xl font-extrabold leading-snug text-ink sm:text-2xl"
        >
          {q.text}
        </motion.h3>
      </AnimatePresence>

      <div className="space-y-3">
        {q.options.map((option, i) => {
          const isSelected = selected === i;
          const isCorrect = locked && i === q.correct;
          const isWrong = locked && isSelected && i !== q.correct;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all active:translate-y-[2px]",
                !locked && isSelected
                  ? "border-accent bg-accent/[0.06] ring-2 ring-accent/30"
                  : !locked &&
                      "border-feather hover:border-accent/40 hover:bg-ink/5",
                locked &&
                  (isCorrect
                    ? "border-success bg-success/10 ring-2 ring-success/30"
                    : isWrong
                      ? "border-danger bg-danger/10 ring-2 ring-danger/30"
                      : "border-feather opacity-45")
              )}
              disabled={locked}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold",
                  locked
                    ? isCorrect
                      ? "bg-success text-white"
                      : isWrong
                        ? "bg-danger text-white"
                        : "bg-ink/5 text-subtle"
                    : isSelected
                      ? "bg-accent text-white"
                      : "bg-ink/5 text-subtle"
                )}
              >
                {LETTERS[i]}
              </span>
              <span className="min-w-0 font-semibold text-ink">{option}</span>
              {locked && isCorrect && (
                <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-success" />
              )}
              {locked && isWrong && (
                <XCircle className="ml-auto h-5 w-5 shrink-0 text-danger" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm leading-relaxed",
                selected === q.correct
                  ? "border-success/30 bg-success/10 text-ink"
                  : "border-danger/30 bg-danger/10 text-ink"
              )}
            >
              <p
                className={cn(
                  "mb-1 flex items-center gap-1.5 text-sm font-extrabold",
                  selected === q.correct ? "text-success" : "text-danger"
                )}
              >
                {selected === q.correct ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Corect!
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" /> Greșit. Răspunsul corect:{" "}
                    {LETTERS[q.correct]}.
                  </>
                )}
              </p>
              {q.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={current === 0}
        >
          <ArrowLeft className="h-4 w-4" /> Înapoi
        </Button>
        {locked ? (
          <Button onClick={goNext}>
            {isLast ? "Vezi rezultatul" : "Continuă"}{" "}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-subtle">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Corectare instant la alegere
          </span>
        )}
      </div>
    </div>
  );
}
