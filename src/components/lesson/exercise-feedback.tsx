"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExerciseFeedback({ correct, explanation }: { correct: boolean; explanation?: string | null }) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 p-3.5 text-sm",
        correct ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10"
      )}
      role="status"
      aria-live="polite"
    >
      <p className={cn("flex items-center gap-2 font-extrabold", correct ? "text-success" : "text-danger")}>
        {correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {correct ? "Corect!" : "Nu chiar."}
      </p>
      {explanation && (
        <p className="mt-1.5 flex items-start gap-1.5 font-semibold text-ink">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
          <span>{explanation}</span>
        </p>
      )}
    </div>
  );
}

/** „Revizuiește conceptul": micro-explicație colapsabilă afișată când răspunsul e greșit. */
export function MicroReview({ title, content }: { title?: string | null; content?: string | null }) {
  const [open, setOpen] = useState(true);
  if (!content) return null;
  return (
    <div className="rounded-xl border border-accent/30 bg-accent/[0.04] p-3.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-extrabold uppercase tracking-widest text-accent">
          {title ?? "Revizuiește conceptul"}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-accent transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-2 text-sm font-semibold leading-relaxed text-ink">{content}</div>}
    </div>
  );
}