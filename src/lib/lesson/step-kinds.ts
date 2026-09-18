// Tipuri canonice de pași pentru experiența interactivă de lecție.
// stepType rămâne un string liber în DB (conventia existentă); acest modul
// ține setul canonic + maparea tipurilor legacy pentru compatibilitate.

export const INTERACTIVE_STEP_TYPES = [
  "INTRO",
  "MICRO_LESSON",
  "QUICK_EXERCISE",
  "EXAMPLE",
  "APPLY",
  "RECALL",
  "MINI_TEST",
  "COMPLETED",
] as const;

export type InteractiveStepType = (typeof INTERACTIVE_STEP_TYPES)[number];

export const LEGACY_STEP_TYPES = [
  "DESCOPERĂ",
  "ÎNȚELEGE",
  "VEZI UN EXEMPLU",
  "ÎNCEARCĂ",
  "EXERSEAZĂ",
  "APLICĂ",
  "RECAPITULEAZĂ",
] as const;

export type StepKind =
  | "intro"
  | "micro"
  | "exercise"
  | "example"
  | "apply"
  | "recall"
  | "minitest"
  | "complete";

/** True dacă step-ul folosește formatul interactiv nou. */
export function isInteractiveStepType(stepType: string | null | undefined): boolean {
  return !!stepType && (INTERACTIVE_STEP_TYPES as readonly string[]).includes(stepType);
}

export interface StepMeta {
  kind: StepKind;
  label: string;
  border: string;
  badge: string;
}

const microAccent = { border: "border-sky-500/40", badge: "bg-sky-500/10 text-sky-600" };
const exerciseAccent = { border: "border-orange-500/40", badge: "bg-orange-500/10 text-orange-500" };
const exampleAccent = { border: "border-emerald-500/40", badge: "bg-emerald-500/10 text-emerald-600" };

export const STEP_ACCENT: Record<StepKind, StepMeta> = {
  intro: { kind: "intro", label: "Obiectiv", border: "border-accent/40", badge: "bg-accent/10 text-accent" },
  micro: { kind: "micro", label: "Concept", border: microAccent.border, badge: microAccent.badge },
  exercise: { kind: "exercise", label: "Exercițiu rapid", border: exerciseAccent.border, badge: exerciseAccent.badge },
  example: { kind: "example", label: "Exemplu", border: exampleAccent.border, badge: exampleAccent.badge },
  apply: { kind: "apply", label: "Aplică", border: "border-violet-500/40", badge: "bg-violet-500/10 text-violet-500" },
  recall: { kind: "recall", label: "Recapitulează", border: "border-warning/40", badge: "bg-warning/10 text-warning" },
  minitest: { kind: "minitest", label: "Mini-test", border: "border-accent/40", badge: "bg-accent/10 text-accent" },
  complete: { kind: "complete", label: "Lecție completată", border: "border-success/40", badge: "bg-success/10 text-success" },
};

/**
 * Rezolvă kind-ul canonic al unui pas atât pentru formatul interactiv nou,
 * cât și pentru pașii legacy (compatibilitate: niciun comportament nu se pierde).
 */
export function resolveStepKind(stepType: string | null | undefined, hasQuiz: boolean): StepKind {
  const t = (stepType ?? "").toUpperCase();
  if (INTERACTIVE_STEP_TYPES.includes(t as InteractiveStepType)) {
    switch (t) {
      case "INTRO":
        return "intro";
      case "MICRO_LESSON":
        return "micro";
      case "QUICK_EXERCISE":
        return "exercise";
      case "EXAMPLE":
        return "example";
      case "APPLY":
        return "apply";
      case "RECALL":
        return "recall";
      case "MINI_TEST":
        return "minitest";
      case "COMPLETED":
        return "complete";
    }
  }
  // legacy
  if (t.includes("EXEMPLU")) return "example";
  if (t.includes("APLIC")) return "apply";
  if (t.includes("RECAPITUL")) return "recall";
  if (hasQuiz) return "exercise";
  return "micro";
}

/** Etichetă pentru progres: pas vizibil scurt. */
export function shortName(kind: StepKind): string {
  switch (kind) {
    case "intro":
      return "Început";
    case "micro":
      return "Concept";
    case "exercise":
      return "Exercițiu";
    case "example":
      return "Exemplu";
    case "apply":
      return "Aplicare";
    case "recall":
      return "Recapitulează";
    case "minitest":
      return "Mini-test";
    case "complete":
      return "Gata";
  }
}