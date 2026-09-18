import {
  generateObject,
  generateText,
  NoObjectGeneratedError,
  type FlexibleSchema,
  type LanguageModel,
  type RepairTextFunction,
} from "ai";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { resolveStudioModel } from "./provider";
import { searchProjectChunks, type ChunkHit } from "./retrieval";
import {
  curriculumSystem,
  curriculumPrompt,
  lessonSystem,
  lessonPrompt,
  quizSystem,
  validationSystem,
  validationPrompt,
} from "./prompts";
import {
  curriculumSchema,
  lessonDraftSchema,
  lessonStepDraftSchema,
  quizDraftSchema,
  checkpointDraftSchema,
  questionDraftSchema,
  validationSchema,
  type CurriculumOutput,
  type LessonDraft,
  type LessonStepDraft,
  type QuizDraft,
  type CheckpointDraft,
  type QuestionDraft,
  type ValidationResult,
  type SourceRef,
  sourceRefSchema,
} from "./types";

export interface GeneratedDraft<T> {
  draft: T;
  references: SourceRef[];
}

const MAX_ATTEMPTS = 2;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof NoObjectGeneratedError) {
        console.warn(
          "[ai-content] generateObject eșuat:",
          err.message,
          "| issues:",
          (err.cause as { issues?: unknown })?.issues ?? err.cause,
          "| text:",
          (err as { text?: string }).text?.slice(0, 1500)
        );
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// ── Repararea output-ului structurat ─────────────────────────────────────────
// Modelele mici (ex. gemini flash-lite) produc uneori JSON valid care nu
// respectă exact schema. AI SDK-ul permite un callback `repairText`: primește
// textul respins și îl trimitem din nou la model, cerând DOAR JSON-ul corectat.
function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
  }
  return trimmed;
}

function formatRepairHint(error: unknown): string {
  const cause = (error as { cause?: { issues?: Array<{ path?: unknown; message?: string }> } })?.cause;
  if (cause && Array.isArray(cause.issues) && cause.issues.length > 0) {
    return cause.issues
      .slice(0, 6)
      .map((i) => {
        const path = Array.isArray(i.path) ? (i.path.join(".") || "(rădăcină)") : String(i.path ?? "(rădăcină)");
        return `${path}: ${i.message}`;
      })
      .join("; ");
  }
  return error instanceof Error ? error.message : "JSON-ul nu respectă structura cerută";
}

function repairWithModel(model: LanguageModel): RepairTextFunction {
  return async ({ text, error }) => {
    try {
      const { text: repaired } = await generateText({
        model,
        temperature: 0,
        system:
          "Corectezi un răspuns JSON generat de alt model pentru conținut educațional în limba română. Primești JSON-ul defect și motivul respingerii. Returnează DOAR JSON-ul complet corectat, fără text suplimentar, fără backticks sau markup.",
        prompt: `Motiv: ${formatRepairHint(error)}\n\nJSON defect:\n${text}`,
      });
      const candidate = stripJsonFence(repaired);
      JSON.parse(candidate);
      return candidate;
    } catch {
      return null;
    }
  };
}

async function generateDraftObject<T extends object>(
  input: {
    model: LanguageModel;
    schema: FlexibleSchema<T>;
    system: string;
    prompt: string;
  }
): Promise<T> {
  const { object } = await generateObject({
    model: input.model,
    schema: input.schema,
    system: input.system,
    prompt: input.prompt,
    repairText: repairWithModel(input.model),
  });
  return object;
}

// ── Corpus pentru planul de curriculum ───────────────────────────────────────
export async function buildCorpus(projectId: string, maxChars = 34000): Promise<string> {
  const chunks = await prisma.contentChunk.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      text: true,
      page: true,
      section: true,
      source: { select: { originalName: true, priority: true } },
    },
  });

  const ordered = [...chunks].sort((a, b) => {
    const pa = prioWeight(a.source.priority);
    const pb = prioWeight(b.source.priority);
    if (pa !== pb) return pb - pa;
    return a.id.localeCompare(b.id);
  });

  let out = "";
  const used = new Set<string>();
  for (const c of ordered) {
    const block = `[Sursa „${c.source.originalName}”${c.page ? `, p.${c.page}` : ""}${c.section ? `, ${c.section}` : ""}]\n${c.text}\n`;
    if (out.length + block.length > maxChars) {
      if (out.length > maxChars * 0.7) break;
      continue;
    }
    out += block;
    used.add(c.id);
  }
  return out || "(proiectul nu are chunks procesate)";
}

function prioWeight(p: string): number {
  switch (p) {
    case "OFFICIAL":
      return 4;
    case "HIGH":
      return 3;
    case "NORMAL":
      return 2;
    default:
      return 1;
  }
}

// ── Curriculum ───────────────────────────────────────────────────────────────
export async function generateCurriculumDraft(input: {
  projectId: string;
  subjectName: string;
  bacYear?: number | null;
  existingStructure?: string;
}): Promise<CurriculumOutput> {
  const studio = await resolveStudioModel();
  const corpus = await buildCorpus(input.projectId);

  return withRetry(() =>
    generateDraftObject<CurriculumOutput>({
      model: studio.model,
      schema: curriculumSchema,
      system: curriculumSystem(),
      prompt: curriculumPrompt({
        subject: input.subjectName,
        bacYear: input.bacYear,
        corpus,
        existingStructure: input.existingStructure,
      }),
    })
  );
}

// ── Context curriculum pentru prompts (din nodurile salvate) ─────────────────
export async function buildUnitContext(unitNodeId: string): Promise<string> {
  const nodes = await prisma.curriculumNode.findMany({
    where: { id: unitNodeId },
    select: { id: true, title: true, description: true, parent: { select: { title: true } }, children: { select: { title: true } } },
  });
  const unit = nodes[0];
  if (!unit) return "";
  const concepts = (unit.children ?? []).map((c) => c.title).slice(0, 12);
  return [
    `Capitol: ${unit.parent?.title ?? "—"}`,
    `Unitate: ${unit.title}${unit.description ? ` — ${unit.description}` : ""}`,
    concepts.length ? `Concepte vizate: ${concepts.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Construirea refs din hits ─────────────────────────────────────────────────
function hitToRef(h: ChunkHit): SourceRef {
  return {
    sourceId: h.sourceId,
    sourceName: h.sourceName,
    page: h.page,
    section: h.section,
    chunkId: h.chunkId,
    snippet: h.text.slice(0, 400),
  };
}

// ── Lecție ───────────────────────────────────────────────────────────────────
export async function generateLessonDraft(input: {
  projectId: string;
  subjectName: string;
  unitNodeId: string;
  unitTitle: string;
  unitDescription?: string;
  concepts: string[];
  lessonTitle: string;
  difficulty?: number;
}): Promise<GeneratedDraft<LessonDraft>> {
  const studio = await resolveStudioModel();
  const hits = await searchProjectChunks(
    input.projectId,
    `${input.unitTitle} ${input.concepts.join(" ")} ${input.subjectName}`.slice(0, 300),
    { limit: 8 }
  );

  const draft = await withRetry(() =>
    generateDraftObject<LessonDraft>({
      model: studio.model,
      schema: lessonDraftSchema,
      system: lessonSystem(),
      prompt: lessonPrompt({
        subject: input.subjectName,
        unitTitle: input.unitTitle,
        unitDescription: input.unitDescription,
        concepts: input.concepts,
        lessonTitle: input.lessonTitle,
        difficulty: input.difficulty ?? 2,
        references: hits,
      }),
    })
  );

  return { draft, references: hits.map(hitToRef) };
}

// ── Quiz ─────────────────────────────────────────────────────────────────────
export async function generateQuizDraft(input: {
  projectId: string;
  subjectName: string;
  unitNodeId: string;
  unitTitle: string;
  unitDescription?: string;
  concepts: string[];
  quizTitle: string;
  questionCount?: number;
  difficulty?: number;
}): Promise<GeneratedDraft<QuizDraft>> {
  const studio = await resolveStudioModel();
  const hits = await searchProjectChunks(
    input.projectId,
    `${input.unitTitle} ${input.concepts.join(" ")} ${input.subjectName}`.slice(0, 300),
    { limit: 8 }
  );

  const count = Math.min(12, Math.max(3, input.questionCount ?? 6));

  const draft = await withRetry(() =>
    generateDraftObject<QuizDraft>({
      model: studio.model,
      schema: quizDraftSchema,
      system: quizSystem(),
      prompt: [
        `Materie: ${input.subjectName}.`,
        `Unitate: „${input.unitTitle}”${input.unitDescription ? ` — ${input.unitDescription}` : ""}.`,
        `Concepte vizate (cele mai importante): ${input.concepts.length ? input.concepts.join(", ") : "toate din unitate"}.`,
        `Generează exact ${count} întrebări (min 3), dificultate ${input.difficulty ?? 2}/3, variate ca tip. Titlul quiz-ului: „${input.quizTitle}”.`,
        "\nSURSELE (sursă unică de adevăr):",
        ...hits.map((h, i) => `[S${i + 1}] Sursa „${h.sourceName}${h.page ? `, p.${h.page}` : ""}”: ${h.text.slice(0, 1400)}`),
      ]
        .filter(Boolean)
        .join("\n\n"),
    })
  );

  return { draft, references: hits.map(hitToRef) };
}

// ── Checkpoint ───────────────────────────────────────────────────────────────
export async function generateCheckpointDraft(input: {
  projectId: string;
  subjectName: string;
  unitNodeId: string;
  unitTitle: string;
  unitDescription?: string;
  concepts: string[];
  checkpointTitle: string;
  quizTitle?: string;
  questionCount?: number;
}): Promise<GeneratedDraft<CheckpointDraft>> {
  const studio = await resolveStudioModel();
  const hits = await searchProjectChunks(
    input.projectId,
    `${input.unitTitle} ${input.concepts.join(" ")} ${input.subjectName}`.slice(0, 300),
    { limit: 8 }
  );
  const count = Math.min(12, Math.max(4, input.questionCount ?? 8));

  const draft = await withRetry(() =>
    generateDraftObject<CheckpointDraft>({
      model: studio.model,
      schema: checkpointDraftSchema,
      system: quizSystem(),
      prompt: [
        `Materie: ${input.subjectName}.`,
        `Checkpoint pentru unitatea „${input.unitTitle}”${input.unitDescription ? ` — ${input.unitDescription}` : ""}.`,
        `Concepte-cheie evaluate: ${input.concepts.length ? input.concepts.join(", ") : "toate din unitate"}.`,
        `Generează exact ${count} întrebări interactive (min 4), care să verifice înțelegerea profundă (nu memorarea), folosind tipurile SINGLE_CHOICE, TRUE_FALSE, MULTIPLE_CHOICE, FILL_BLANK, ORDERING cu câmpul answer conform structurii cerute.`,
        `Titlul checkpoint: „${input.checkpointTitle}”, titlul quiz-ului asociat: „${input.quizTitle || `Checkpoint ${input.unitTitle}`}”.`,
        "\nSURSELE (sursă unică de adevăr):",
        ...hits.map((h, i) => `[S${i + 1}] Sursa „${h.sourceName}${h.page ? `, p.${h.page}` : ""}”: ${h.text.slice(0, 1400)}`),
      ]
        .filter(Boolean)
        .join("\n\n"),
    })
  );

  return { draft, references: hits.map(hitToRef) };
}

// ── Validare AI ──────────────────────────────────────────────────────────────
export async function validateDraft(input: {
  projectId: string;
  itemType: string;
  title: string;
  draft: unknown;
  sourceRefs: SourceRef[];
  curriculumContext: string;
}): Promise<ValidationResult> {
  const studio = await resolveStudioModel();
  const query = input.title;
  const hits = await searchProjectChunks(input.projectId, query, { limit: 6 });

  const result = await withRetry(() =>
    generateDraftObject<ValidationResult>({
      model: studio.model,
      schema: validationSchema,
      system: validationSystem(),
      prompt: validationPrompt({
        itemType: input.itemType,
        title: input.title,
        draft: input.draft,
        references: hits,
        sourceRefs: input.sourceRefs,
        curriculumContext: input.curriculumContext,
      }),
    })
  );

  return normalizeAndClampValidation(result);
}

// ── Normalizare + scor final determinist ──────────────────────────────────────
const CANONICAL_CRITERIA = [
  { key: "acuratete", label: "Acuratețe", weight: 0.35 },
  { key: "aliniere", label: "Aliniere curriculum", weight: 0.2 },
  { key: "acoperire", label: "Acoperire surse", weight: 0.2 },
  { key: "calitate", label: "Calitate educațională", weight: 0.25 },
] as const;

// Normalizează numele criteriilor (ignorând diacriticele/casing-ul) la etichete
// canonice și recomputează overallScore ca medie ponderată deterministă, cu
// clamp-uri pentru issue-uri critice sau acoperire slabă a surselor.
export function normalizeAndClampValidation(raw: ValidationResult): ValidationResult {
  const fold = (s: string) =>
    s
      .toLowerCase()
      .replace(/[ăâ]/g, "a")
      .replace(/î/g, "i")
      .replace(/[șş]/g, "s")
      .replace(/[țţ]/g, "t");

  const matchKey = (label: string) => {
    const folded = fold(label);
    return CANONICAL_CRITERIA.find((c) => folded.includes(c.key));
  };

  const used = new Set<string>();
  const criteria: ValidationResult["criteria"] = [];
  for (const canon of CANONICAL_CRITERIA) {
    const found = raw.criteria.find((c) => matchKey(c.name)?.key === canon.key);
    if (found) {
      used.add(fold(found.name));
      criteria.push({ name: canon.label, score: clampScore(found.score), feedback: found.feedback });
    }
  }
  for (const c of raw.criteria) {
    if (!used.has(fold(c.name))) {
      criteria.push({ name: c.name, score: clampScore(c.score), feedback: c.feedback });
    }
  }

  let weighted = 0;
  let totalWeight = 0;
  for (const canon of CANONICAL_CRITERIA) {
    const found = criteria.find((c) => c.name === canon.label);
    if (found) {
      weighted += found.score * canon.weight;
      totalWeight += canon.weight;
    }
  }
  let overall = totalWeight > 0 ? Math.round(weighted / totalWeight) : clampScore(raw.overallScore);

  const hasCritical = (raw.issues ?? []).some((i) => fold(i.severity) === "critical");
  const cov = raw.sourceCoverage;
  const coverageRatio =
    cov && typeof cov.totalChunks === "number" && cov.totalChunks > 0
      ? (cov.citedChunks ?? 0) / cov.totalChunks
      : null;
  if (hasCritical || (coverageRatio !== null && coverageRatio < 0.5)) {
    overall = Math.min(overall, 70);
  }

  return { ...raw, overallScore: overall, criteria };
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

// ── Regenerare localizată ────────────────────────────────────────────────────
export async function regenerateLessonStep(input: {
  stepIndex: number;
  current: unknown;
  instruction: string;
  references: ChunkHit[];
  unitContext: string;
}): Promise<LessonStepDraft> {
  const studio = await resolveStudioModel();
  return withRetry(() =>
    generateDraftObject<LessonStepDraft>({
      model: studio.model,
      schema: lessonStepDraftSchema,
      system: lessonSystem(),
      prompt: [
        input.unitContext,
        `Recreează DOAR pasul cu indexul ${input.stepIndex} din draft-ul lecției de mai jos, aplicând cerința: „${input.instruction}”.`,
        `Păstrează tipul pasului (INTRO/MICRO_LESSON/EXAMPLE/QUICK_EXERCISE/APPLY/RECALL/MINI_TEST) și rolul lui în lecție. Dacă pasul are quiz, păstrează tipurile interactive ale întrebărilor (SINGLE_CHOICE/TRUE_FALSE/MULTIPLE_CHOICE/FILL_BLANK/ORDERING) și câmpul answer corect.`,
        `Draft-ul curent al pașului:\n${JSON.stringify(input.current, null, 2)}`,
        "\nSURSELE (sursă unică de adevăr):",
        ...input.references.map((h, i) => `[S${i + 1}] Sursa „${h.sourceName}${h.page ? `, p.${h.page}` : ""}”: ${h.text.slice(0, 1200)}`),
      ].join("\n\n"),
    })
  );
}

export async function regenerateQuestion(input: {
  qIndex: number;
  current: unknown;
  instruction: string;
  references: ChunkHit[];
  unitContext: string;
}): Promise<QuestionDraft> {
  const studio = await resolveStudioModel();
  return withRetry(() =>
    generateDraftObject<QuestionDraft>({
      model: studio.model,
      schema: questionDraftSchema,
      system: quizSystem(),
      prompt: [
        input.unitContext,
        `Recreează DOAR întrebarea cu indexul ${input.qIndex} din quiz-ul de mai jos, aplicând cerința: „${input.instruction}”.`,
        `Păstrează tipul întrebării (SINGLE_CHOICE/TRUE_FALSE/MULTIPLE_CHOICE/FILL_BLANK/ORDERING) și câmpul answer conform structurii cerute, dacă nu se cere altceva explicit.`,
        `Întrebarea curentă:\n${JSON.stringify(input.current, null, 2)}`,
        "\nSURSELE (sursă unică de adevăr):",
        ...input.references.map((h, i) => `[S${i + 1}] Sursa „${h.sourceName}${h.page ? `, p.${h.page}` : ""}”: ${h.text.slice(0, 1200)}`),
      ].join("\n\n"),
    })
  );
}

// Serializează refs primite de la AI (curriculum) — doar cele cu chunk valid din proiect.
export async function filterValidRefs(
  projectId: string,
  refs: Array<{ chunkId?: string; sourceId?: string; page?: number }>
): Promise<SourceRef[]> {
  const ids = refs.map((r) => r.chunkId).filter(Boolean) as string[];
  if (ids.length === 0) return [] as SourceRef[];
  const chunks = await prisma.contentChunk.findMany({
    where: { projectId, id: { in: ids } },
    select: { id: true, sourceId: true, page: true, section: true, source: { select: { originalName: true } } },
  });
  const map = new Map(chunks.map((c) => [c.id, c]));
  return refs
    .map((r) => {
      const c = r.chunkId ? map.get(r.chunkId) : undefined;
      if (!c) return null;
      return sourceRefSchema.parse({
        chunkId: c.id,
        sourceId: c.sourceId,
        page: c.page ?? undefined,
        section: c.section ?? undefined,
        sourceName: c.source.originalName,
      });
    })
    .filter((r): r is SourceRef => Boolean(r));
}

export { z, searchProjectChunks };