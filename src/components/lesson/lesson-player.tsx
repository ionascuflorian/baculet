"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/lesson/exercise-schema";
import { normalizeQuestion } from "@/lib/lesson/exercise-schema";
import { resolveStepKind, STEP_ACCENT, shortName } from "@/lib/lesson/step-kinds";
import { completeLessonStep, submitLessonAnswer, completeLessonAnswers, type LessonAnswerMode } from "@/lib/actions/progress";
import { LessonProgressHeader } from "./lesson-progress-header";
import { ExerciseBatch } from "./exercise-batch";
import { ConfettiBurst } from "@/components/confetti-burst";

export type PlayerQuestionData = {
  id: string;
  text: string;
  options: unknown;
  correctIndex: number;
  answer?: unknown;
  explanation?: string | null;
  type: string;
  difficulty?: number;
  conceptId?: string | null;
  concept?: string | null;
};

export type PlayerQuizData = { id: string; title: string; questions: PlayerQuestionData[] };

export type PlayerStepData = {
  id: string;
  title: string | null;
  content: string;
  order: number;
  stepType?: string | null;
  quiz?: PlayerQuizData | null;
};

export interface PlayerConcept {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  lessonId: string;
  lessonSlugPath: string;
  steps: PlayerStepData[];
  doneStepIds: Set<string>;
  objective?: string | null;
  estimatedMinutes?: number | null;
  concepts?: PlayerConcept[];
  nextHref?: string | null;
  chapterHref?: string | null;
  nextTitle?: string | null;
}

function exercisesOf(step: PlayerStepData): Exercise[] {
  return (step.quiz?.questions ?? []).map((q) =>
    normalizeQuestion({
      id: q.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      answer: q.answer,
      explanation: q.explanation,
      type: q.type,
      concept: q.concept,
      conceptId: q.conceptId,
      difficulty: q.difficulty,
    })
  );
}

export function LessonPlayer({
  lessonId,
  lessonSlugPath,
  steps,
  doneStepIds,
  objective,
  estimatedMinutes,
  concepts = [],
  nextHref,
  chapterHref,
  nextTitle,
}: Props) {
  const [active, setActive] = useState(() => {
    if (steps.length === 0) return 0;
    const firstUndone = steps.findIndex((s) => !doneStepIds.has(s.id));
    return firstUndone === -1 ? steps.length - 1 : firstUndone;
  });
  const [localDone, setLocalDone] = useState<Set<string>>(doneStepIds);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [miniTestFail, setMiniTestFail] = useState<{ pct: number; weak: { conceptId: string | null; concept: string | null }[] } | null>(null);
  const [minitestAttempt, setMinitestAttempt] = useState(0);
  const { showToast } = useToast();
  const [pending] = useTransition();
  const reduced = useReducedMotion();

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  const isLocked = (idx: number) => {
    if (idx === 0) return false;
    for (let i = 0; i < idx; i++) if (!localDone.has(steps[i].id)) return true;
    return false;
  };

  const current = steps.length > 0 ? steps[active] : null;
  const kind = current ? resolveStepKind(current?.stepType, !!(current?.quiz && current.quiz.questions.length > 0)) : "complete";
  const accent = STEP_ACCENT[kind];
  const exercises = current ? exercisesOf(current) : [];
  const isDone = current ? localDone.has(current.id) : false;
  const locked = steps.length > 0 && current ? isLocked(active) : false;
  const pct = steps.length > 0 ? Math.round((localDone.size / steps.length) * 100) : 0;
  const allDone = steps.length > 0 && localDone.size === steps.length;
  const firstActionable = steps.findIndex((s, i) => !localDone.has(s.id) && !isLocked(i));
  const hasContent = current ? current.content.trim().length > 0 : false;

  if (!current) return null;

  const markDoneOptimistic = (stepId: string) => setLocalDone((s) => new Set(s).add(stepId));

  const completeNonQuiz = async () => {
    if (locked || !current) return;
    setBusy(true);
    try {
      const res = await completeLessonStep(current.id, lessonId, lessonSlugPath, { skipSoftMastery: true });
      markDoneOptimistic(current.id);
      if (res.lessonCompleted) setCelebrate(true);
      else if (active < steps.length - 1) setActive((a) => a + 1);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Eroare la salvare");
    } finally {
      setBusy(false);
    }
  };

  const handleVerdict = (questionId: string, raw: unknown) => {
    void submitLessonAnswer(current.id, questionId, raw ?? null).catch((e) => console.error("submitLessonAnswer", e));
  };

  const completeQuizStep = async (answers: Record<string, unknown>, mode: LessonAnswerMode) => {
    if (locked || !current) return;
    setBusy(true);
    try {
      const res = await completeLessonAnswers(current.id, lessonId, lessonSlugPath, answers, mode);
      if (res.completed) {
        markDoneOptimistic(current.id);
        setMiniTestFail(null);
        if (localDone.size + 1 === steps.length) setCelebrate(true);
        else if (active < steps.length - 1) setActive((a) => a + 1);
      } else if (mode === "minitest") {
        setMiniTestFail({ pct: res.pct ?? 0, weak: res.weak ?? [] });
        setMinitestAttempt((a) => a + 1);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Eroare la salvare");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <LessonProgressHeader
        steps={steps}
        activeId={current.id}
        doneIds={localDone}
        isLocked={isLocked}
        onSelect={(idx) => {
          if (isLocked(idx)) {
            showToast("Finalizează secțiunea anterioară mai întâi.");
            return;
          }
          setActive(idx);
        }}
        pct={pct}
        feedback={(idx) =>
          idx === active
            ? `${shortName(resolveStepKind(steps[idx].stepType, !!(steps[idx].quiz?.questions.length)))} — pasul curent`
            : null
        }
      />

      {/* Intro (pas INTRO sau când există obiectiv și primul pas nu e exercițiu) */}
      <div className={cn("rounded-2xl border bg-card p-5 sm:p-6", accent.border)}>
        {kind === "intro" && (
          <IntroCard
            objective={objective ?? current.content}
            estimatedMinutes={estimatedMinutes}
            conceptCount={concepts.length}
            stepCount={steps.length}
            onStart={completeNonQuiz}
            busy={busy || pending}
          />
        )}

        {kind === "micro" && (
          <TheoryCard step={current} accent={accent} onDone={completeNonQuiz} busy={busy || pending} done={isDone} locked={locked} />
        )}

        {(kind === "example" || kind === "apply" || kind === "recall" || kind === "exercise") && (
          <QuizCard
            step={current}
            accent={accent}
            content={hasContent ? current.content : null}
            exercises={exercises}
            conceptMap={conceptMap}
            onVerdict={handleVerdict}
            onFinish={(answers) => void completeQuizStep(answers, "practice")}
            busy={busy}
            batchKey={current.id}
            locked={locked}
            done={isDone}
          />
        )}

        {kind === "minitest" && (
          <MiniTestCard
            step={current}
            exercises={exercises}
            conceptMap={conceptMap}
            onVerdict={handleVerdict}
            onFinish={(answers) => void completeQuizStep(answers, "minitest")}
            busy={busy}
            batchKey={`${current.id}-${minitestAttempt}`}
            fail={miniTestFail}
            onRetry={() => setMiniTestFail(null)}
            locked={locked}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {locked ? (
          <Button size="sm" onClick={() => setActive(firstActionable)}>
            <ArrowRight className="h-4 w-4" /> Parcurge de unde ai rămas
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" disabled={active === 0 || busy} onClick={() => setActive((a) => a - 1)}>
              <ArrowLeft className="h-4 w-4" /> Înapoi
            </Button>
            {allDone && (
              <Button size="sm" onClick={() => setCelebrate(true)}>
                <CheckCircle2 className="h-4 w-4" /> Recapitulez lecția
              </Button>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {celebrate && (
          <CelebrateModal
            stepCount={steps.length}
            nextHref={nextHref}
            chapterHref={chapterHref}
            nextTitle={nextTitle}
            onClose={() => setCelebrate(false)}
            reduced={!!reduced}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function IntroCard({ objective, estimatedMinutes, conceptCount, stepCount, onStart, busy }: {
  objective: string;
  estimatedMinutes: number | null | undefined;
  conceptCount: number;
  stepCount: number;
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest", STEP_ACCENT.intro.badge)}>
          Obiectivul lecției
        </span>
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Target className="h-5 w-5 text-accent" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold text-ink">Ce vei învăța</h2>
          <div className="prose-lesson mt-1 text-sm font-semibold leading-relaxed text-subtle">
            <Markdown content={objective} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-bold text-subtle">
        <span className="inline-flex items-center gap-1 rounded-full bg-feather/60 px-3 py-1">
          <Clock className="h-3.5 w-3.5" /> ~{estimatedMinutes ?? 10} min
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-feather/60 px-3 py-1">
          {conceptCount} {conceptCount === 1 ? "concept" : "concepte"}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-feather/60 px-3 py-1">
          {stepCount} pași
        </span>
      </div>
      <div className="flex justify-end">
        <Button onClick={onStart} disabled={busy}>Începe lecția <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function TheoryCard({ step, accent, onDone, busy, done, locked }: {
  step: PlayerStepData;
  accent: { label: string; badge: string; border: string };
  onDone: () => void;
  busy: boolean;
  done: boolean;
  locked: boolean;
}) {
  // conținut extra (Află mai mult) după markerul `<!-- afla-mai-mult -->`
  const parts = step.content.split("<!-- afla-mai-mult -->");
  const main = parts[0] ?? "";
  const extra = parts[1]?.trim() ?? null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest", accent.badge)}>{accent.label}</span>
      </div>
      {step.title && <h2 className="mb-2 text-xl font-extrabold text-ink">{step.title}</h2>}
      {!locked && <Markdown content={main} />}
      {extra && !locked && (
        <details className="mt-4 rounded-xl border border-feather bg-background/50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-extrabold text-subtle">Află mai mult</summary>
          <div className="prose-lesson mt-2 text-sm text-ink"><Markdown content={extra} /></div>
        </details>
      )}
      {locked && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-extrabold text-warning">Secțiune blocată</p>
          <p className="mt-1 text-sm font-semibold text-subtle">Finalizează secțiunea anterioară pentru a continua.</p>
        </div>
      )}
      {!locked && (
        <div className="mt-5 flex justify-end">
          <Button onClick={onDone} disabled={busy}>
            {done ? <><Circle className="h-4 w-4" /> Refă pasul</> : <><CheckCircle2 className="h-4 w-4" /> Am înțeles</>}
          </Button>
        </div>
      )}
    </div>
  );
}

function QuizCard({ step, accent, content, exercises, conceptMap, onVerdict, onFinish, busy, batchKey, locked, done }: {
  step: PlayerStepData;
  accent: { label: string; badge: string; border: string };
  content: string | null;
  exercises: Exercise[];
  conceptMap: ReadonlyMap<string, { name: string; description: string | null }>;
  onVerdict: (qid: string, raw: unknown, correct: boolean) => void;
  onFinish: (answers: Record<string, unknown>, result: { correct: number; total: number; pct: number }) => void;
  busy: boolean;
  batchKey: string;
  locked: boolean;
  done: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest", accent.badge)}>{accent.label}</span>
        {done && <span className="inline-flex rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-success">Rezolvat</span>}
      </div>
      {step.title && <h2 className="mb-2 text-xl font-extrabold text-ink">{step.title}</h2>}
      {!locked && content && <Markdown content={content} />}
      {!locked && exercises.length > 0 && (
        <div className="mt-5">
          <ExerciseBatch
            key={batchKey}
            exercises={exercises}
            mode="practice"
            conceptMap={conceptMap}
            onVerdict={onVerdict}
            onFinish={(answers, result) => onFinish(answers, result)}
          />
        </div>
      )}
      {locked && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-extrabold text-warning">Secțiune blocată</p>
          <p className="mt-1 text-sm font-semibold text-subtle">Finalizează secțiunea anterioară pentru a continua.</p>
        </div>
      )}
      {exercises.length === 0 && !locked && (
        <div className="mt-5 flex justify-end">
          <Button disabled={busy} onClick={() => onFinish({}, { correct: 0, total: 0, pct: 0 })}>
            <CheckCircle2 className="h-4 w-4" /> Am analizat exemplul
          </Button>
        </div>
      )}
    </div>
  );
}

function MiniTestCard({ step, exercises, conceptMap, onVerdict, onFinish, busy, batchKey, fail, onRetry, locked }: {
  step: PlayerStepData;
  exercises: Exercise[];
  conceptMap: ReadonlyMap<string, { name: string; description: string | null }>;
  onVerdict: (qid: string, raw: unknown, correct: boolean) => void;
  onFinish: (answers: Record<string, unknown>) => void;
  busy: boolean;
  batchKey: string;
  fail: { pct: number; weak: { conceptId: string | null; concept: string | null }[] } | null;
  onRetry: () => void;
  locked: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest", STEP_ACCENT.minitest.badge)}>Mini-test</span>
      </div>
      {step.title && <h2 className="mb-2 text-xl font-extrabold text-ink">{step.title}</h2>}
      <p className="mb-4 text-sm font-semibold text-subtle">Răspunde corect la minimum 70% pentru a finaliza lecția.</p>
      {locked ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-extrabold text-warning">Secțiune blocată</p>
          <p className="mt-1 text-sm font-semibold text-subtle">Finalizează secțiunile anterioare pentru a continua.</p>
        </div>
      ) : fail ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-danger/40 bg-danger/10 p-5 text-center">
            <p className="text-lg font-extrabold text-ink">Scor: {fail.pct}%</p>
            <p className="text-sm font-semibold text-subtle">Ai nevoie de minimum 70% pentru a finaliza lecția.</p>
          </div>
          {fail.weak.length > 0 && (
            <div className="rounded-xl border border-feather bg-background/50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-subtle">Revizuiește conceptele:</p>
              <ul className="mt-2 space-y-2">
                {fail.weak.map((w, i) => (
                  <li key={i} className="rounded-lg bg-card px-3 py-2 text-sm font-semibold text-ink">
                    {w.concept ?? "Concept"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={onRetry} disabled={busy}>Reia mini-testul <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : (
        <ExerciseBatch
          key={batchKey}
          exercises={exercises}
          mode="minitest"
          conceptMap={conceptMap}
          onVerdict={onVerdict}
          onFinish={(answers) => onFinish(answers)}
        />
      )}
    </div>
  );
}

function CelebrateModal({ stepCount, nextHref, chapterHref, nextTitle, onClose, reduced }: {
  stepCount: number;
  nextHref?: string | null;
  chapterHref?: string | null;
  nextTitle?: string | null;
  onClose: () => void;
  reduced: boolean;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto absolute inset-0 bg-background/60 backdrop-blur-sm"
          onClick={onClose}
        />
        {!reduced && <ConfettiBurst pieces={42} />}
        <motion.div
          initial={{ scale: 0.85, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="pointer-events-auto relative z-10 flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border bg-card px-6 py-7 text-center shadow-2xl"
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
          <p className="text-sm font-semibold text-subtle">+{5 * stepCount} XP · Ai trecut mini-testul. Ești o stea!</p>
          <div className="mt-2 flex w-full flex-col gap-2">
            {nextHref ? (
              <Button asChild size="lg" className="w-full">
                <Link href={nextHref} onClick={onClose}>
                  {nextTitle ? `Următoarea: ${nextTitle}` : "Următoarea lecție"} <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            ) : chapterHref ? (
              <Button asChild size="lg" className="w-full">
                <Link href={chapterHref} onClick={onClose}>Înapoi la modul</Link>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onClose}>Continuă aici</Button>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}