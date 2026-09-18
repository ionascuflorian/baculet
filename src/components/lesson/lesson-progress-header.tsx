"use client";

import { CheckCircle2, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ProgressStepRef {
  id: string;
  title: string | null;
}

interface Props {
  steps: ProgressStepRef[];
  activeId: string;
  doneIds: Set<string>;
  isLocked: (idx: number) => boolean;
  onSelect: (idx: number) => void;
  pct: number;
  feedback?: (idx: number, locked: boolean, done: boolean) => string | null;
  rightLabel?: string;
}

/** Bara de progres universală a lecțiilor (legacy + interactiv). */
export function LessonProgressHeader({ steps, activeId, doneIds, isLocked, onSelect, pct, feedback, rightLabel }: Props) {
  const active = Math.max(0, steps.findIndex((s) => s.id === activeId));
  return (
    <div className="sticky top-[calc(65px+env(safe-area-inset-top))] z-20 -mx-4 border-b border-feather bg-background/80 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border overflow-visible">
      <div className="mb-1 flex items-center justify-between text-xs font-bold">
        <span className="text-ink">Progres lecție</span>
        <span className="text-accent">
          {rightLabel ?? `Secțiunea ${active + 1} din ${steps.length} · ${pct}%`}
        </span>
      </div>
      <Progress value={pct} />
      <div className="mt-3 flex gap-1.5 overflow-x-auto overflow-y-visible py-1.5 -my-1.5 px-1 -mx-1 scrollbar-thin">
        {steps.map((s, idx) => {
          const done = doneIds.has(s.id);
          const locked = isLocked(idx);
          const activeIs = s.id === activeId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(idx)}
              aria-label={`Pasul ${idx + 1}${locked ? " (blocat)" : ""}`}
              title={feedback?.(idx, locked, done) ?? (s.title ?? `Pasul ${idx + 1}`) + (locked ? " (parcurge anteriorul)" : "")}
              className={cn(
                "flex h-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold transition-all",
                activeIs
                  ? "scale-105 border-accent bg-accent text-white shadow-md"
                  : done
                    ? "border-success bg-success/10 text-success"
                    : locked
                      ? "border-warning/30 bg-warning/10 text-warning"
                      : "border-feather bg-card text-subtle hover:border-accent/40"
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : locked ? <Lock className="h-3 w-3" /> : idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}