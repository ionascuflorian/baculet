"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type QuestionDraftShape = {
  text?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  type?: string;
  concept?: string;
};

type StepDraftShape = {
  type?: string;
  title?: string;
  content?: string;
  minReadTime?: number;
  quiz?: QuestionDraftShape[];
};

type LessonDraftShape = {
  title?: string;
  description?: string;
  content?: string;
  difficulty?: number;
  concepts?: Array<{ name?: string; description?: string }>;
  steps?: StepDraftShape[];
};

type QuizDraftShape = {
  title?: string;
  description?: string;
  quizTitle?: string;
  difficulty?: number;
  questions?: QuestionDraftShape[];
};

const questionTypeLabels: Record<string, string> = {
  SINGLE: "Grilă",
  CLOZE: "Completare",
  FLASHCARD: "Card",
  DRAG_DROP: "Potrivire",
  SINGLE_CHOICE: "Grilă",
  TRUE_FALSE: "Adevărat/Fals",
  MULTIPLE_CHOICE: "Alege toate",
  FILL_BLANK: "Completează",
  MATCHING: "Potrivește",
  ORDERING: "Ordonează",
  IMAGE_CHOICE: "Alege imaginea",
  CLASSIFICATION: "Clasifică",
};

const stepTypeLabels: Record<string, string> = {
  INTRO: "Obiectiv",
  MICRO_LESSON: "Concept",
  QUICK_EXERCISE: "Exercițiu rapid",
  EXAMPLE: "Exemplu",
  APPLY: "Aplică",
  RECALL: "Recapitulează",
  MINI_TEST: "Mini-test",
  DESCOPERĂ: "Descoperă",
  ÎNȚELEGE: "Înțelege",
  "VEZI UN EXEMPLU": "Vezi un exemplu",
  ÎNCEARCĂ: "Încearcă",
  EXERSEAZĂ: "Exersează",
  APLICĂ: "Aplică",
  RECAPITULEAZĂ: "Recapitulează",
};

const stepTypeColors: Record<string, string> = {
  INTRO: "bg-accent/10 text-accent",
  MICRO_LESSON: "bg-sky-500/10 text-sky-700",
  QUICK_EXERCISE: "bg-orange-500/10 text-orange-700",
  EXAMPLE: "bg-emerald-500/10 text-emerald-700",
  APPLY: "bg-violet-500/10 text-violet-700",
  RECALL: "bg-amber-500/10 text-amber-700",
  MINI_TEST: "bg-accent/10 text-accent",
  DESCOPERĂ: "bg-sky-500/10 text-sky-700",
  ÎNȚELEGE: "bg-violet-500/10 text-violet-700",
  "VEZI UN EXEMPLU": "bg-amber-500/10 text-amber-700",
  ÎNCEARCĂ: "bg-teal-500/10 text-teal-700",
  EXERSEAZĂ: "bg-emerald-500/10 text-emerald-700",
  APLICĂ: "bg-indigo-500/10 text-indigo-700",
  RECAPITULEAZĂ: "bg-rose-500/10 text-rose-700",
};

const difficultyLabels: Record<number, string> = { 1: "Ușor", 2: "Mediu", 3: "Avansat" };

function Difficulty({ value }: { value?: number }) {
  const v = typeof value === "number" && value >= 1 && value <= 3 ? value : null;
  if (v === null) return null;
  return (
    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-subtle">
      Dificultate: {difficultyLabels[v]}
    </span>
  );
}

function QuestionList({ questions }: { questions?: QuestionDraftShape[] }) {
  if (!questions || questions.length === 0) return null;
  return (
    <div className="space-y-2">
      {questions.map((q, i) => {
        const correct = q.correctIndex;
        return (
          <div key={i} className="rounded-xl border border-feather bg-background/60 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{q.text}</p>
                {q.type ? (
                  <span className="mt-1 inline-block rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-subtle">
                    {questionTypeLabels[q.type] ?? q.type}
                  </span>
                ) : null}
                {Array.isArray(q.options) && q.options.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => {
                      const isCorrect = typeof correct === "number" && oi === correct;
                      return (
                        <li
                          key={oi}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-1 text-sm",
                            isCorrect
                              ? "bg-emerald-500/10 font-semibold text-emerald-700"
                              : "text-ink/80"
                          )}
                        >
                          {isCorrect ? (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-ink/20" />
                          )}
                          <span>{opt}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {q.explanation ? (
                  <p className="mt-2 text-xs text-subtle">
                    <span className="font-bold text-ink">Explicație: </span>
                    {q.explanation}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LessonPreview({ draft }: { draft: LessonDraftShape }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-extrabold text-ink">{draft.title}</h4>
          <Difficulty value={draft.difficulty} />
        </div>
        {draft.description ? <p className="mt-1 text-sm text-subtle">{draft.description}</p> : null}
        {draft.content ? (
          <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{draft.content}</p>
        ) : null}
      </div>
      {draft.concepts && draft.concepts.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-subtle">Concepte</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {draft.concepts.map((c, i) => (
              <li
                key={i}
                title={c.description}
                className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent"
              >
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {draft.steps && draft.steps.length > 0 ? (
        <ol className="space-y-3">
          {draft.steps.map((step, i) => (
            <li key={i} className="rounded-xl border border-feather bg-background/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-subtle">Pas {i + 1}</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    stepTypeColors[step.type ?? "DESCOPERĂ"] ?? "bg-ink/5 text-ink"
                  )}
                >
                  {stepTypeLabels[step.type ?? "DESCOPERĂ"] ?? step.type}
                </span>
                {typeof step.minReadTime === "number" ? (
                  <span className="text-[11px] text-subtle">~{step.minReadTime}s</span>
                ) : null}
              </div>
              {step.title ? <p className="mt-1 text-sm font-semibold text-ink">{step.title}</p> : null}
              {step.content ? (
                <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{step.content}</p>
              ) : null}
              {step.quiz && step.quiz.length > 0 ? (
                <div className="mt-2 border-t border-feather pt-2">
                  <QuestionList questions={step.quiz} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function QuizPreview({ draft }: { draft: QuizDraftShape }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-base font-extrabold text-ink">{draft.title ?? draft.quizTitle}</h4>
          <Difficulty value={draft.difficulty} />
        </div>
        {draft.description ? <p className="mt-1 text-sm text-subtle">{draft.description}</p> : null}
      </div>
      <QuestionList questions={draft.questions} />
    </div>
  );
}

export function DraftPreview({ type, draft }: { type: string; draft: unknown }) {
  if (type === "LESSON") {
    return <LessonPreview draft={draft as LessonDraftShape} />;
  }
  return <QuizPreview draft={draft as QuizDraftShape} />;
}