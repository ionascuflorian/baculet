// Normalizare deterministă a drafturilor generate de AI Content Studio.
// Modelele mici nu respectă întotdeauna promptul și pot răspunde pe formatul
// legacy (pași DESCOPERĂ/EXERSEAZĂ, întrebări SINGLE/CLOZE ș.a.m.d.). Această
// normalizare garantează că orice draft publicat devine interactiv, indiferent
// de ce produce modelul. Modul pur: nu importă prisma.
import { INTERACTIVE_STEP_TYPES } from "@/lib/lesson/step-kinds";
import type {
  QuestionDraft,
  LessonDraft,
  LessonStepDraft,
  QuizDraft,
  CheckpointDraft,
} from "./types";
import { QUESTION_TYPES } from "./types";

type InteractiveStepType = (typeof INTERACTIVE_STEP_TYPES)[number];
type QuestionType = (typeof QUESTION_TYPES)[number];

const LEGACY_STEP_TO_INTERACTIVE: Record<string, string> = {
  DESCOPERĂ: "MICRO_LESSON",
  ÎNȚELEGE: "MICRO_LESSON",
  "VEZI UN EXEMPLU": "EXAMPLE",
  ÎNCEARCĂ: "QUICK_EXERCISE",
  EXERSEAZĂ: "QUICK_EXERCISE",
  APLICĂ: "APPLY",
  RECAPITULEAZĂ: "RECALL",
};

/** Convertește un tip de pas legacy în echivalentul interactiv (fallback: MICRO_LESSON). */
export function normalizeStepType(stepType: string | null | undefined): InteractiveStepType {
  const key = (stepType ?? "").toUpperCase();
  const mapped = LEGACY_STEP_TO_INTERACTIVE[key];
  if (mapped) return mapped as InteractiveStepType;
  if ((INTERACTIVE_STEP_TYPES as readonly string[]).includes(key)) {
    return key as InteractiveStepType;
  }
  return "MICRO_LESSON";
}

const LEGACY_QUESTION_TO_INTERACTIVE: Record<string, string> = {
  SINGLE: "SINGLE_CHOICE",
  FLASHCARD: "SINGLE_CHOICE",
  DRAG_DROP: "SINGLE_CHOICE",
  CLOZE: "FILL_BLANK",
};

function answerKind(answer: unknown): string | null {
  if (!answer || typeof answer !== "object") return null;
  const kind = (answer as { kind?: unknown }).kind;
  return typeof kind === "string" ? kind : null;
}

/** Normalizează o întrebare: tip legacy → interactiv + answer garantat. */
export function normalizeQuestionDraft(q: QuestionDraft): QuestionDraft {
  const type = (LEGACY_QUESTION_TO_INTERACTIVE[q.type] ??
    q.type) as QuestionType;
  const options = Array.isArray(q.options) ? q.options : [];
  const max = Math.max(options.length - 1, 0);
  const correctIndex = Math.min(Math.max(Math.trunc(q.correctIndex ?? 0), 0), max);
  const kind = answerKind(q.answer);

  switch (type) {
    case "TRUE_FALSE":
    case "SINGLE_CHOICE": {
      let answer: QuestionDraft["answer"];
      if (kind === "single" || kind === "true_false") {
        const idx = (q.answer as { index?: unknown }).index;
        if (typeof idx === "number" && Number.isInteger(idx)) {
          answer = { kind: type === "TRUE_FALSE" ? "true_false" : "single", index: idx };
        }
      }
      return { ...q, type, options, correctIndex, answer };
    }
    case "MULTIPLE_CHOICE": {
      let indices: number[] = [];
      if (kind === "multiple" && Array.isArray((q.answer as { indices?: unknown }).indices)) {
        indices = ((q.answer as { indices: unknown }).indices as unknown[])
          .filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= max);
      }
      if (indices.length === 0 && options.length > 0) indices = [Math.min(correctIndex, max)];
      return { ...q, type, options, correctIndex, answer: { kind: "multiple", indices } };
    }
    case "FILL_BLANK": {
      let accepted: string[] = [];
      if (kind === "fill_blank" && Array.isArray((q.answer as { accepted?: unknown }).accepted)) {
        accepted = ((q.answer as { accepted: unknown }).accepted as unknown[])
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim());
      }
      if (accepted.length === 0) {
        const opt = options[correctIndex];
        if (typeof opt === "string" && opt.trim().length > 0) accepted = [opt.trim()];
      }
      return { ...q, type, options, correctIndex, answer: { kind: "fill_blank", accepted } };
    }
    case "ORDERING": {
      let order: number[] = [];
      if (kind === "ordering" && Array.isArray((q.answer as { order?: unknown }).order)) {
        order = ((q.answer as { order: unknown }).order as unknown[])
          .filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0)
          .slice(0, options.length);
      }
      if (order.length === 0) order = options.map((_, i) => i);
      return { ...q, type, options, correctIndex, answer: { kind: "ordering", order } };
    }
    default:
      // MATCHING / IMAGE_CHOICE / CLASSIFICATION: se păstrează answer-ul emis de model.
      return { ...q, type, options, correctIndex };
  }
}

/** Normalizează un pas de lecție + întrebările lui. */
export function normalizeStepDraft(step: LessonStepDraft): LessonStepDraft {
  const quiz =
    Array.isArray(step.quiz) && step.quiz.length > 0
      ? step.quiz.map(normalizeQuestionDraft)
      : undefined;
  let type = normalizeStepType(step.type);
  if (quiz && quiz.length > 0 && (type === "MICRO_LESSON" || type === "INTRO")) {
    type = "QUICK_EXERCISE";
  }
  return { ...step, type, quiz };
}

/**
 * Normalizează o lecție: toți pașii devin interactivi, iar dacă nu există un
 * MINI_TEST și lecția are cel puțin 2 pași, ultimul pas cu quiz devine MINI_TEST.
 */
export function normalizeLessonDraft(draft: LessonDraft): LessonDraft {
  const steps = draft.steps.map(normalizeStepDraft);
  const hasMinitest = steps.some((s) => s.type === "MINI_TEST");
  const hasQuiz = steps.some((s) => (s.quiz?.length ?? 0) > 0);
  let normalizedSteps = steps;
  if (hasQuiz && !hasMinitest && steps.length >= 2) {
    for (let i = steps.length - 1; i >= 0; i--) {
      if ((steps[i].quiz?.length ?? 0) > 0) {
        normalizedSteps = steps.map((s, si) => (si === i ? { ...s, type: "MINI_TEST" as const } : s));
        break;
      }
    }
  }
  return {
    ...draft,
    steps: normalizedSteps,
    objective:
      draft.objective && draft.objective.trim().length > 0
        ? draft.objective
        : `În această lecție vei învăța despre „${draft.title}”.`,
    estimatedMinutes:
      draft.estimatedMinutes && draft.estimatedMinutes >= 1
        ? draft.estimatedMinutes
        : defaultEstimatedMinutes(steps.length),
  };
}

/** Durată estimată din numărul de pași (2–6 min/pas, plafonat la 45). */
function defaultEstimatedMinutes(stepCount: number): number {
  return Math.min(45, Math.max(8, stepCount * 3 + 4));
}

export function normalizeQuizDraft(draft: QuizDraft): QuizDraft {
  return { ...draft, questions: draft.questions.map(normalizeQuestionDraft) };
}

export function normalizeCheckpointDraft(draft: CheckpointDraft): CheckpointDraft {
  return { ...draft, questions: draft.questions.map(normalizeQuestionDraft) };
}

/** Dispatcher după tipul de item. */
export function normalizeItemDraft(type: string, draft: unknown):
  | LessonDraft
  | QuizDraft
  | CheckpointDraft {
  if (type === "LESSON") return normalizeLessonDraft(draft as LessonDraft);
  if (type === "QUIZ") return normalizeQuizDraft(draft as QuizDraft);
  return normalizeCheckpointDraft(draft as CheckpointDraft);
}