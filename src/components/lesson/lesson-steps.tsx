"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, ArrowRight, ArrowLeft, Sparkles, Circle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { completeLessonStep, uncompleteLessonStep } from "@/lib/actions/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { ConfettiBurst } from "@/components/confetti-burst";
import { InlineQuiz, type InlineQuizData } from "./inline-quiz";

export interface StepData {
  id: string;
  title: string | null;
  content: string;
  order: number;
  stepType?: string | null;
  quiz?: InlineQuizData | null;
}

interface Props {
  lessonId: string;
  lessonSlugPath: string;
  steps: StepData[];
  doneStepIds: Set<string>;
  isLessonDone: boolean;
  nextHref?: string | null;
  chapterHref?: string | null;
  nextTitle?: string | null;
}

export function LessonSteps({ lessonId, lessonSlugPath, steps, doneStepIds, isLessonDone, nextHref, chapterHref, nextTitle }: Props) {
  const [active, setActive] = useState(() => {
    if (steps.length === 0) return 0;
    const firstUndone = steps.findIndex((s) => !doneStepIds.has(s.id));
    return firstUndone === -1 ? steps.length - 1 : firstUndone;
  });
  const [pending, start] = useTransition();
  const [localDone, setLocalDone] = useState<Set<string>>(doneStepIds);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const { showToast } = useToast();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalDone(new Set(doneStepIds));
  }, [doneStepIds]);

  useEffect(() => () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); }, []);

  const reduced = useReducedMotion();
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
    if (isLocked(active)) {
      showToast("Parcurge pașii anteriori mai întâi.");
      return;
    }
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
            // rămâne vizibil până apasă utilizatorul (nu auto-hide)
          } else if (canGoNext) {
            timeoutRef.current = window.setTimeout(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 400);
          }
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Eroare la salvare");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Bara de progres universală */}
      <div className="sticky top-[57px] z-20 -mx-4 border-b border-feather bg-background/80 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border overflow-visible">
        <div className="mb-1 flex items-center justify-between text-xs font-bold">
          <span className="text-ink">Progres lecție</span>
          <span className="text-accent">{pct}% · {localDone.size}/{steps.length} pași</span>
        </div>
        <Progress value={pct} />
        <div className="mt-3 flex gap-1.5 overflow-x-auto overflow-y-visible py-1.5 -my-1.5 px-1 -mx-1 scrollbar-thin">
          {steps.map((s, idx) => {
            const done = localDone.has(s.id);
            const locked = isLocked(idx);
            const activeIs = idx === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(idx)}
                className={cn(
                  "flex h-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold transition-all",
                  activeIs ? "scale-105 border-accent bg-accent text-white shadow-md" : done ? "border-success bg-success/10 text-success" : locked ? "border-warning/30 bg-warning/10 text-warning" : "border-feather bg-card text-subtle hover:border-accent/40"
                )}
                title={(s.title ?? `Pasul ${idx + 1}`) + (locked ? " (recomandat să parcurgi anteriorul)" : "")}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pas curent */}
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        {current.stepType && (
          <span className="mb-2 inline-flex rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-accent">
            {current.stepType}
          </span>
        )}
        {current.title && <h2 className="mb-2 text-xl font-extrabold text-ink">{current.title}</h2>}
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
            {isDone ? <><Circle className="h-4 w-4" /> Refă pasul</> : isLocked(active) ? <><Lock className="h-4 w-4" /> Blocat</> : <><CheckCircle2 className="h-4 w-4" /> Marchează parcurs</>}
          </Button>
          {canGoNext ? (
            <Button
              variant="secondary"
              size="sm"
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
          <MotionConfig reducedMotion="user">
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto"
                onClick={() => setShowCelebrate(false)}
              />
              {!reduced && <ConfettiBurst pieces={42} />}
              <motion.div
                initial={{ scale: 0.85, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className="pointer-events-auto relative z-10 flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-card px-6 py-7 text-center shadow-2xl border"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 12, delay: 0.08 }}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
                >
                  <Sparkles className="h-8 w-8 text-success" />
                </motion.div>
                <p className="text-xl font-extrabold text-ink">Lecție finalizată! 🎉</p>
                <p className="text-sm font-semibold text-subtle">+{5 * steps.length} XP · Toți pașii parcurși. Ești o stea!</p>
                <div className="mt-2 flex w-full flex-col gap-2">
                  {nextHref ? (
                    <Button asChild size="lg" className="w-full">
                      <Link href={nextHref} onClick={() => setShowCelebrate(false)}>
                        {nextTitle ? `Următoarea: ${nextTitle}` : "Următoarea lecție"} <ArrowRight className="h-5 w-5" />
                      </Link>
                    </Button>
                  ) : chapterHref ? (
                    <Button asChild size="lg" className="w-full">
                      <Link href={chapterHref} onClick={() => setShowCelebrate(false)}>Înapoi la capitol</Link>
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => setShowCelebrate(false)}>Continuă aici</Button>
                </div>
              </motion.div>
            </div>
          </MotionConfig>
        )}
      </AnimatePresence>
    </div>
  );
}
