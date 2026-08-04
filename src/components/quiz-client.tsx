"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { submitQuiz } from "@/lib/actions/quiz";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
}

interface QuizClientProps {
  quizId: string;
  quizSlug: string;
  title: string;
  questions: QuizQuestion[];
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizClient({ quizId, quizSlug, title, questions }: QuizClientProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "playing">("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const isLast = current === questions.length - 1;
  const q = questions[current];
  const answeredCount = useMemo(
    () => Object.keys(answers).length + (selected !== null ? 1 : 0),
    [answers, selected]
  );
  const pct = Math.round((answeredCount / questions.length) * 100);

  function start() {
    setPhase("playing");
  }

  function goNext() {
    if (selected !== null) {
      setAnswers((a) => ({ ...a, [q.id]: selected }));
    }
    setSelected(null);
    setCurrent((c) => Math.min(c + 1, questions.length - 1));
  }

  function goBack() {
    setSelected(answers[questions[current - 1]?.id] ?? null);
    setCurrent((c) => Math.max(c - 1, 0));
  }

  async function submit() {
    setPending(true);
    setError("");
    try {
      const finalAnswers =
        selected !== null ? { ...answers, [q.id]: selected } : answers;
      const { attemptId } = await submitQuiz(quizId, finalAnswers);
      router.push(`/teste/${quizSlug}/rezultate?attempt=${attemptId}`);
    } catch {
      setError("Ceva n-a mers. Încearcă din nou.");
      setPending(false);
    }
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent/10 text-3xl">
          ✍️
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-subtle">
            {questions.length} întrebări grilă · alege răspunsul corect și
            trimite la final.
          </p>
        </div>
        <Button size="lg" onClick={start}>
          <CheckCircle2 className="h-5 w-5" /> Începe testul
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span className="text-ink">
            Întrebarea {current + 1} din {questions.length}
          </span>
          <span className="text-accent">{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <h1 className="text-2xl font-extrabold leading-snug text-ink">{q.text}</h1>

      <div className="space-y-3">
        {q.options.map((option, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all active:translate-y-[2px]",
                isSelected
                  ? "border-accent bg-accent/[0.06] ring-2 ring-accent/30"
                  : "border-feather hover:border-accent/40 hover:bg-ink/5"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold",
                  isSelected ? "bg-accent text-white" : "bg-ink/5 text-subtle"
                )}
              >
                {LETTERS[i]}
              </span>
              <span className="font-semibold text-ink">{option}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} disabled={current === 0}>
          <ArrowLeft className="h-4 w-4" /> Înapoi
        </Button>
        {isLast ? (
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-5 w-5 animate-spin" />}
            {pending ? "Se trimite…" : "Trimite testul"}
          </Button>
        ) : (
          <Button onClick={goNext}>
            Continuă <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
