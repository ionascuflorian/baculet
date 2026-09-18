"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/lesson/exercise-schema";
import { checkAnswer, parseUserAnswer } from "@/lib/lesson/exercise-schema";
import { cn } from "@/lib/utils";
import { ExerciseInput } from "./exercise-input";
import { ExerciseFeedback, MicroReview } from "./exercise-feedback";

export type BatchMode = "practice" | "minitest";

export interface BatchResult {
  correct: number;
  total: number;
  pct: number;
}

interface Props {
  exercises: Exercise[];
  mode: BatchMode;
  /** concept → descriere scurtă, pentru „Revizuiește conceptul". */
  conceptMap: ReadonlyMap<string, { name: string; description: string | null }>;
  /** Apelat la fiecare verificare (înregistrare review/mastery pe server). */
  onVerdict: (questionId: string, raw: unknown, correct: boolean) => void;
  /** Apelat când lotul e complet (toate corecte / sumar mini-test). */
  onFinish: (answers: Record<string, unknown>, result: BatchResult) => void;
}

type Verdict = { revealed: boolean; correct: boolean };

export function ExerciseBatch({ exercises, mode, conceptMap, onVerdict, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [raws, setRaws] = useState<Record<string, unknown>>({});
  const [verdicts, setVerdicts] = useState<Record<string, Verdict | undefined>>({});

  if (exercises.length === 0) return null;

  const current = exercises[index];
  const isLast = index === exercises.length - 1;
  const verdict = verdicts[current.id];
  const result: BatchResult = {
    correct: exercises.filter((e) => verdicts[e.id]?.correct).length,
    total: exercises.length,
    pct: Math.round((exercises.filter((e) => verdicts[e.id]?.correct).length / exercises.length) * 100),
  };

  function check() {
    const raw = raws[current.id];
    const userAnswer = parseUserAnswer(current.kind, raw);
    const correct = userAnswer ? checkAnswer(current, userAnswer) : false;
    setVerdicts((v) => ({ ...v, [current.id]: { revealed: true, correct } }));
    onVerdict(current.id, raw, correct);
  }

  function advance() {
    if (isLast) {
      const all = Object.fromEntries(exercises.map((e) => [e.id, raws[e.id]]));
      onFinish(all, result);
      return;
    }
    setIndex((i) => i + 1);
  }

  function retry() {
    setVerdicts((v) => ({ ...v, [current.id]: undefined }));
    setRaws((r) => ({ ...r, [current.id]: undefined }));
  }

  const raw = raws[current.id];
  const canCheck = !verdict?.revealed && raw !== undefined && raw !== "";

  const allRevealed = exercises.every((e) => verdicts[e.id]?.revealed);

  return (
    <div>
      {/* Mini-progres în test */}
      {mode === "minitest" && exercises.length > 1 && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {exercises.map((e, i) => (
              <div
                key={e.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  verdicts[e.id]?.revealed
                    ? verdicts[e.id]!.correct
                      ? "bg-success"
                      : "bg-danger"
                    : i === index
                      ? "bg-accent"
                      : "bg-feather"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-subtle">{index + 1}/{exercises.length}</span>
        </div>
      )}

      {mode === "minitest" && allRevealed && isLast ? (
        <div className="rounded-2xl border-2 border-accent/30 bg-accent/[0.04] p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
          <p className="mt-2 text-lg font-extrabold text-ink">Scor: {result.correct}/{result.total}</p>
          <p className="text-sm font-semibold text-subtle">
            {result.pct}% — {result.pct >= 70 ? "ai trecut!" : "trebuie minimum 70% pentru a continua"}
          </p>
          <Button className="mt-4" onClick={() => {
            const all = Object.fromEntries(exercises.map((e) => [e.id, raws[e.id]]));
            onFinish(all, result);
          }}>
            Vezi rezultatul
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18 }}
            className="space-y-3"
          >
            <p className="text-base font-extrabold text-ink">{current.prompt}</p>

            <ExerciseInput
              exercise={current}
              value={raw}
              onChange={(v) => setRaws((r) => ({ ...r, [current.id]: v }))}
              disabled={verdict?.revealed}
            />

            {!verdict?.revealed && (
              <div className="flex justify-end pt-1">
                <Button onClick={check} disabled={!canCheck}>
                  Verifică răspunsul
                </Button>
              </div>
            )}

            {verdict?.revealed && (
              <div className="space-y-3 pt-1">
                <ExerciseFeedback correct={verdict.correct} explanation={current.explanation} />
                {!verdict.correct && (
                  <MicroReview
                    title={current.concept ? `Revizuiește: ${current.concept}` : "Revizuiește conceptul"}
                    content={current.conceptId ? (conceptMap.get(current.conceptId)?.description ?? null) : null}
                  />
                )}
                <div className="flex justify-end">
                  {mode === "practice" && !verdict.correct ? (
                    <Button variant="secondary" onClick={retry}>Încearcă din nou</Button>
                  ) : mode === "practice" && isLast ? (
                    <Button onClick={advance}>Finalizează secțiunea</Button>
                  ) : isLast ? (
                    <Button onClick={advance}>Termină testul <ArrowRight className="h-4 w-4" /></Button>
                  ) : (
                    <Button onClick={advance}>Următoarea <ArrowRight className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}