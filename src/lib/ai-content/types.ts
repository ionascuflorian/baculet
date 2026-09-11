import { z } from "zod/v4";

// ── Source refs ──────────────────────────────────────────────────────────────
// Legătura dintre un item generat și chunks-urile din sursele proiectului.
export const sourceRefSchema = z.object({
  sourceId: z.string(),
  sourceName: z.string().optional(),
  page: z.coerce.number().int().optional(),
  section: z.string().optional(),
  chunkId: z.string().optional(),
  snippet: z.string().optional(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

// ── Draft întrebare (același shape ca Question) ──────────────────────────────
export const questionDraftSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(2),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().default(""),
  type: z.enum(["SINGLE", "CLOZE", "FLASHCARD", "DRAG_DROP"]).default("SINGLE"),
  concept: z.string().optional(),
});
export type QuestionDraft = z.infer<typeof questionDraftSchema>;

// ── Draft lecție (Lesson + LessonStep dintr-un singur payload) ───────────────
export const lessonStepDraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  type: z
    .enum(["DESCOPERĂ", "ÎNȚELEGE", "VEZI UN EXEMPLU", "ÎNCEARCĂ", "EXERSEAZĂ", "APLICĂ", "RECAPITULEAZĂ"])
    .default("DESCOPERĂ"),
  content: z.string().min(2),
  minReadTime: z.coerce.number().int().min(5).max(600).default(15),
  quiz: questionDraftSchema.array().optional(), // pentru steps de tip EXERSEAZĂ / APLICĂ
});
export type LessonStepDraft = z.infer<typeof lessonStepDraftSchema>;

export const lessonDraftSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  difficulty: z.coerce.number().int().min(1).max(3).default(1),
  concepts: z
    .array(z.object({ name: z.string().min(2), description: z.string().optional() }))
    .default([]),
  steps: z.array(lessonStepDraftSchema).min(1),
});
export type LessonDraft = z.infer<typeof lessonDraftSchema>;

// ── Draft quiz ───────────────────────────────────────────────────────────────
export const quizDraftSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  difficulty: z.coerce.number().int().min(1).max(3).default(1),
  questions: z.array(questionDraftSchema).min(1),
});
export type QuizDraft = z.infer<typeof quizDraftSchema>;

// ── Draft checkpoint ─────────────────────────────────────────────────────────
// Întrebările checkpoint-ului ajung într-un Quiz atașat unit/chapter (vezi
// evaluateCheckpoint din src/lib/checkpoint.ts).
export const checkpointDraftSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  quizTitle: z.string().min(2),
  questions: z.array(questionDraftSchema).min(3),
});
export type CheckpointDraft = z.infer<typeof checkpointDraftSchema>;

export const itemDraftSchema = z.union([lessonDraftSchema, quizDraftSchema, checkpointDraftSchema]);
export type ItemDraft = z.infer<typeof itemDraftSchema>;

// ── Rezultat validare AI ─────────────────────────────────────────────────────
export const validationIssueSchema = z.object({
  severity: z.enum(["critical", "warning", "info"]),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof validationIssueSchema>;

export const validationSchema = z.object({
  overallScore: z.coerce.number().int().min(0).max(100),
  criteria: z.array(
    z.object({
      name: z.string(),
      score: z.coerce.number().int().min(0).max(100),
      feedback: z.string(),
    })
  ),
  issues: z.array(validationIssueSchema),
  suggestions: z.array(z.string()),
  sourceCoverage: z.object({
    citedChunks: z.coerce.number().int(),
    totalChunks: z.coerce.number().int(),
    gaps: z.array(z.string()),
  }),
});
export type ValidationResult = z.infer<typeof validationSchema>;

// ── Curriculum (arbore draft) ────────────────────────────────────────────────
export const curriculumSchema = z.object({
  chapters: z.array(
    z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      units: z.array(
        z.object({
          title: z.string().min(2),
          description: z.string().optional(),
          references: z
            .array(
              z.object({
                chunkId: z.string().optional(),
                sourceId: z.string().optional(),
                page: z.coerce.number().int().optional(),
              })
            )
            .optional()
            .default([]),
          concepts: z.array(
            z.object({
              name: z.string().min(2),
              description: z.string().optional(),
              references: z
                .array(
                  z.object({
                    chunkId: z.string().optional(),
                    sourceId: z.string().optional(),
                    page: z.number().int().optional(),
                  })
                )
                .optional()
                .default([]),
            })
          ),
        })
      ),
    })
  ),
});
export type CurriculumOutput = z.infer<typeof curriculumSchema>;

// ── Parametrii standard de generare (partajează retrieved context) ───────────
export interface GenerationContext {
  curriculum: string; // conținut pentru „unit" curent (titluri + descrieri)
  references: SourceRef[];
  subject: string;
  bacYear?: number | null;
}

// ── Versiuni ─────────────────────────────────────────────────────────────────
export interface DraftVersionEntry {
  version: number;
  at: string;
  draft: ItemDraft;
  note?: string;
}