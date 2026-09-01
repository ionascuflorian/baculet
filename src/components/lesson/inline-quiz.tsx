"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InlineQuizData {
  id: string;
  title: string;
  questions: { id: string; text: string; options: string[]; correctIndex: number; explanation?: string | null; type: string }[];
}

export function InlineQuiz({ quiz, stepId, onPassed }: { quiz: InlineQuizData; stepId: string; onPassed?: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [flashIdx, setFlashIdx] = useState(0);

  const q = quiz.questions[0];
  const isSingle = quiz.questions.length === 1;

  if (!q) return null;

  const hasFlash = q.type === "FLASHCARD";
  const hasCloze = q.type === "CLOZE";

  const current = hasFlash ? quiz.questions[flashIdx] : q;
  const selected = answers[current.id];
  const isCorrect = selected === current.correctIndex;

  function check() {
    setRevealed(true);
    // dacă toate răspunsurile corecte, notifică părinte
    const allCorrect = quiz.questions.every((qq) => answers[qq.id] === qq.correctIndex || (qq.id === current.id && selected === qq.correctIndex));
    if (allCorrect) onPassed?.();
  }

  if (hasFlash) {
    return (
      <div className="rounded-xl border-2 border-accent/20 bg-accent/[0.04] p-4">
        <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-accent">Flashcard {flashIdx + 1}/{quiz.questions.length}</p>
        <p className="font-bold text-ink">{current.text}</p>
        <div className="mt-3 grid gap-2">
          {current.options.map((opt, i) => {
            const sel = selected === i;
            const showResult = revealed && sel;
            return (
              <button
                key={i}
                onClick={() => !revealed && setAnswers((a) => ({ ...a, [current.id]: i }))}
                className={cn(
                  "rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition-all",
                  !revealed && sel ? "border-accent bg-accent/10 ring-2 ring-accent/20" : !revealed ? "border-feather hover:border-accent/30" : sel && isCorrect ? "border-success bg-success/10" : sel ? "border-danger bg-danger/10" : "border-feather opacity-60",
                  "flex items-center gap-2"
                )}
              >
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold", sel ? "bg-accent text-white" : "bg-ink/5")}>{String.fromCharCode(65 + i)}</span>
                {opt}
                {showResult && isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
                {showResult && !isCorrect && <XCircle className="ml-auto h-4 w-4 text-danger" />}
              </button>
            );
          })}
        </div>
        {revealed && current.explanation && (
          <p className="mt-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-ink">💡 {current.explanation}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <Button size="sm" variant="ghost" disabled={flashIdx === 0} onClick={() => { setRevealed(false); setFlashIdx((x) => x - 1); }}>Înapoi</Button>
          {!revealed ? (
            <Button size="sm" disabled={selected === undefined} onClick={check}>Verifică</Button>
          ) : flashIdx < quiz.questions.length - 1 ? (
            <Button size="sm" onClick={() => { setRevealed(false); setFlashIdx((x) => x + 1); }}>Următorul</Button>
          ) : (
            <span className={cn("text-sm font-bold", isCorrect ? "text-success" : "text-danger")}>{isCorrect ? "Bravo!" : "Mai încearcă"}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-accent/20 bg-accent/[0.04] p-4">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-accent"><Lightbulb className="h-3.5 w-3.5" /> Mini-quiz — verifică-te rapid</p>
      <p className="font-bold text-ink">{current.text}</p>
      <div className="mt-3 grid gap-2">
        {current.options.map((opt, i) => {
          const sel = selected === i;
          const showCorrect = revealed && i === current.correctIndex;
          const showWrong = revealed && sel && !isCorrect;
          return (
            <button
              key={i}
              onClick={() => !revealed && setAnswers((a) => ({ ...a, [current.id]: i }))}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition-all flex items-center gap-2",
                !revealed && sel ? "border-accent bg-accent/10 ring-2 ring-accent/20" : !revealed ? "border-feather hover:border-accent/30" : showCorrect ? "border-success bg-success/10" : showWrong ? "border-danger bg-danger/10" : "border-feather opacity-60"
              )}
            >
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold", sel ? "bg-accent text-white" : "bg-ink/5")}>{String.fromCharCode(65 + i)}</span>
              {opt}
              {showCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-success" />}
              {showWrong && <XCircle className="ml-auto h-4 w-4 text-danger" />}
            </button>
          );
        })}
      </div>
      {!revealed ? (
        <Button size="sm" className="mt-3" disabled={selected === undefined} onClick={check}>Verifică răspunsul</Button>
      ) : (
        <div className="mt-3">
          <p className={cn("text-sm font-bold", isCorrect ? "text-success" : "text-danger")}>{isCorrect ? "✅ Corect! +5 XP" : "❌ Mai încearcă data viitoare"}</p>
          {current.explanation && <p className="mt-1 rounded-lg bg-card px-3 py-2 text-sm text-subtle">💡 {current.explanation}</p>}
          {!isCorrect && <Button size="sm" variant="ghost" className="mt-2" onClick={() => setRevealed(false)}>Încearcă din nou</Button>}
        </div>
      )}
    </div>
  );
}
