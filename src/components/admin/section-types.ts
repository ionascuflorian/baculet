export type SectionKind = "theory" | "example" | "exercise";

export interface SectionDto {
  id: string;
  title: string | null;
  content: string;
  order: number;
  stepType: string | null;
  minReadTime: number;
  manual: boolean;
  quiz: { id: string; title: string; questionCount: number } | null;
}

export interface QuizOptionDto {
  id: string;
  title: string;
  difficulty: number;
  questionCount: number;
  usedByOther: boolean;
  inThisLesson: boolean;
}

export function sectionKind(s: SectionDto): SectionKind {
  if (s.quiz) return "exercise";
  if (s.stepType?.toUpperCase().includes("EXEMPLU")) return "example";
  return "theory";
}

export const KIND_META: Record<
  SectionKind,
  { label: string; border: string; tint: string; badge: string }
> = {
  theory: {
    label: "Teorie",
    border: "border-sky-500/30",
    tint: "bg-sky-500/5",
    badge: "bg-sky-500/10 text-sky-600",
  },
  example: {
    label: "Exemplu",
    border: "border-emerald-500/30",
    tint: "bg-emerald-500/5",
    badge: "bg-emerald-500/10 text-emerald-600",
  },
  exercise: {
    label: "Exercițiu",
    border: "border-orange-500/30",
    tint: "bg-orange-500/5",
    badge: "bg-orange-500/10 text-orange-600",
  },
};