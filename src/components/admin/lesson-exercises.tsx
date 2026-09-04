"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X, Trash2, Loader2, Lightbulb, HelpCircle } from "lucide-react";
import { QuestionForm } from "@/components/admin/question-form";
import { AiExerciseGenerator } from "@/components/admin/ai-exercise-generator";
import { deleteQuestion } from "@/lib/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface LessonExercise {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  type: string;
  concept: string | null;
  order: number;
}

export function LessonExercises({
  path,
  quizId,
  lessonTitle,
  subjectName,
  lessonContent,
  questions,
}: {
  path: string;
  quizId: string;
  lessonTitle: string;
  subjectName: string;
  lessonContent: string;
  questions: LessonExercise[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const newOrder = questions.reduce((max, q) => Math.max(max, q.order), -1) + 1;
  const editing = questions.find((q) => q.id === editingId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-ink">
          Exerciții ({questions.length})
        </h2>
        {!adding && !editing && (
          <Button type="button" variant="accent" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Adaugă exercițiu
          </Button>
        )}
      </div>

      {questions.length === 0 && !adding && (
        <p className="rounded-xl bg-feather/60 px-4 py-3 text-sm font-semibold text-subtle">
          Nicio exercițiu încă. Adaugă primul exercițiu sau folosește generatorul AI din
          secțiunea de jos.
        </p>
      )}

      {(adding || editing) && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-bold text-ink">
                {adding ? "Exercitiu nou" : "Editează exercițiul"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditingId(null);
                }}
                className="rounded-full p-1.5 text-subtle hover:bg-feather"
                aria-label="Închide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <QuestionForm
              quizId={quizId}
              questionId={adding ? null : editingId}
              redirectTo={path}
              initial={
                adding
                  ? { text: "", options: [], correctIndex: 0, explanation: "", type: "SINGLE", concept: "", order: newOrder }
                  : {
                      text: editing?.text ?? "",
                      options: editing?.options ?? [],
                      correctIndex: editing?.correctIndex ?? 0,
                      explanation: editing?.explanation ?? "",
                      type: editing?.type ?? "SINGLE",
                      concept: editing?.concept ?? "",
                      order: editing?.order ?? newOrder,
                    }
              }
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {questions.map((q) => (
          <ExerciseRow
            key={q.id}
            exercise={q}
            path={path}
            onEdit={() => {
              setAdding(false);
              setEditingId(q.id);
            }}
            onDone={() => {
              setAdding(false);
              setEditingId(null);
            }}
          />
        ))}
      </div>

      <div className="border-t border-feather pt-4">
        <AiExerciseGenerator
          path={path}
          quizId={quizId}
          lessonTitle={lessonTitle}
          subjectName={subjectName}
          lessonContent={lessonContent}
          onGenerated={() => {
            setAdding(false);
            setEditingId(null);
          }}
        />
      </div>
    </div>
  );
}

function ExerciseRow({
  exercise: q,
  path,
  onEdit,
  onDone,
}: {
  exercise: LessonExercise;
  path: string;
  onEdit: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isNonSingle = q.type !== "SINGLE";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-ink">
              {q.order + 1}. {q.text}
              {isNonSingle && (
                <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-extrabold text-warning">
                  {q.type}
                </span>
              )}
            </p>
            {q.concept && <p className="text-xs text-subtle">concept: {q.concept}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {q.options.map((opt, i) => (
                <span
                  key={i}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                    i === q.correctIndex ? "bg-accent/10 text-accent" : "bg-feather text-subtle"
                  }`}
                >
                  {opt}
                </span>
              ))}
            </div>
            {q.explanation && (
              <p className="mt-2 flex items-start gap-1 text-xs text-subtle">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {q.explanation}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("Sigur vrei să ștergi acest exercițiu?")) {
                  startTransition(async () => {
                    await deleteQuestion(q.id, { revalidate: [path] });
                    router.refresh();
                    onDone();
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {pending ? "…" : "Șterge"}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-xl border border-feather px-3 py-2 text-xs font-bold text-accent hover:bg-feather"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Editează
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
