"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock, ArrowRight, ArrowLeft, Sparkles, Circle } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { completeLessonStep, uncompleteLessonStep } from "@/lib/actions/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { InlineQuiz, type InlineQuizData } from "./inline-quiz";

export interface StepData {
  id: string;
  title: string | null;
  content: string;
  order: number;
  quiz?: InlineQuizData | null;
}

interface Props {
  lessonId: string;
  lessonSlugPath: string;
  steps: StepData[];
  doneStepIds: Set<string>;
  isLessonDone: boolean;
}

export function LessonSteps({ lessonId, lessonSlugPath, steps, doneStepIds, isLessonDone }: Props) {
  const [active, setActive] = useState(() => {
    if (steps.length === 0) return 0;
    const firstUndone = steps.findIndex((s) => !doneStepIds.has(s.id));
    return firstUndone === -1 ? steps.length - 1 : firstUndone;
  });
  const [pending, start] = useTransition();
  const [localDone, setLocalDone] = useState<Set<string>>(doneStepIds);
  const [showCelebrate, setShowCelebrate] = useState(false);

  if (steps.length === 0) return null;

  const current = steps[active];
  const isDone = localDone.has(current.id);
  const pct = Math.round((localDone.size / steps.length) * 100);
  const canGoNext = active < steps.length - 1;
  const canGoPrev = active > 0;

  // gating: pasul 0 liber, restul necesită precedent bifat
  const isLocked = (idx: number) => {
    if (idx === 0) return false;
    for (let i = 0; i < idx; i++) if (!localDone.has(steps[i].id)) return true;
    return false;
  };

  function handleComplete() {
    if (isLocked(active)) return;
    start(async () => {
      try {
        if (isDone) {
          await uncompleteLessonStep(current.id, lessonId, lessonSlugPath);
          setLocalDone((s) => {
            const n = new Set(s);
            n.delete(current.id);
            return n;
          });
        } else {
          const res = await completeLessonStep(current.id, lessonId, lessonSlugPath);
          setLocalDone((s) => new Set(s).add(current.id));
          if (res.lessonCompleted) {
            setShowCelebrate(true);
            setTimeout(() => setShowCelebrate(false), 3200);
          } else if (canGoNext) {
            // avans automat după 400ms
            setTimeout(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 400);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Bara de progres universală */}
      <div className="sticky top-[57px] z-20 -mx-4 border-b border-feather bg-background/80 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border">
        <div className="mb-1 flex items-center justify-between text-xs font-bold">
          <span className="text-ink">Progres lecție</span>
          <span className="text-accent">{pct}% · {localDone.size}/{steps.length} pași</span>
        </div>
        <Progress value={pct} />
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {steps.map((s, idx) => {
            const done = localDone.has(s.id);
            const locked = isLocked(idx);
            const activeIs = idx === active;
            return (
              <button
                key={s.id}
                onClick={() => !locked && setActive(idx)}
                disabled={locked}
                className={cn(
                  "flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold transition-all",
                  activeIs ? "scale-110 border-accent bg-accent text-white" : done ? "border-success bg-success/10 text-success" : locked ? "border-feather bg-feather/30 text-subtle" : "border-feather bg-card text-subtle hover:border-accent/40"
                )}
                title={s.title ?? `Pasul ${idx + 1}`}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pas curent */}
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        {current.title && <h2 className="mb-3 text-xl font-extrabold text-ink">{current.title}</h2>}
        <Markdown content={current.content} />
        {current.quiz && (
          <div className="mt-6">
            <InlineQuiz
              quiz={current.quiz}
              stepId={current.id}
              onPassed={() => {
                // quiz trecut → marchează pasul automat dacă nu e deja
                if (!localDone.has(current.id)) handleComplete();
              }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" disabled={!canGoPrev} onClick={() => setActive((a) => a - 1)}>
          <ArrowLeft className="h-4 w-4" /> Înapoi
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant={isDone ? "outline" : "default"}
            size="sm"
            disabled={pending || isLocked(active)}
            onClick={handleComplete}
            className="min-w-36"
          >
            {isDone ? <><Circle className="h-4 w-4" /> Refă pasul</> : isLocked(active) ? <><Lock className="h-4 w-4" /> Blocat</> : <><CheckCircle2 className="h-4 w-4" /> Marchează parcuris</>}
          </Button>
          {canGoNext ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={isLocked(active + 1)}
              onClick={() => setActive((a) => a + 1)}
            >
              Continuă <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-xs font-bold text-subtle">Ultimul pas</span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCelebrate && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-success px-6 py-4 text-center text-white shadow-xl"
          >
            <p className="flex items-center justify-center gap-2 text-base font-extrabold"><Sparkles className="h-5 w-5" /> Lecție finalizată! +{5 * steps.length} XP</p>
            <p className="text-sm opacity-90">Toți pașii parcurși. Felicitări!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
