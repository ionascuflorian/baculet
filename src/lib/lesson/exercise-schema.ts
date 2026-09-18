// Modul PURI, partajat între renderer (client) și server actions.
// NU importă prisma sau „server-only". Toate tipurile de exercițiu interactive
// sunt descrise canonic aici, ca să nu existe drift între scorare și UI.

export const EXERCISE_KINDS = [
  "single",
  "true_false",
  "multiple",
  "fill_blank",
  "matching",
  "ordering",
  "image_choice",
  "classification",
] as const;

export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

// Mapare din valorile DB ale enum-ului QuestionType în kinds canonice.
// Tipurile legacy (SINGLE/CLOZE/FLASHCARD/DRAG_DROP) sunt normalizate;
// DRAG_DROP legacy se afișează ca single-select până la migrarea conținutului
// (comportament identic cu renderer-ul actual).
export const KIND_BY_DB_TYPE: Record<string, ExerciseKind> = {
  SINGLE_CHOICE: "single",
  TRUE_FALSE: "true_false",
  MULTIPLE_CHOICE: "multiple",
  FILL_BLANK: "fill_blank",
  MATCHING: "matching",
  ORDERING: "ordering",
  IMAGE_CHOICE: "image_choice",
  CLASSIFICATION: "classification",
  SINGLE: "single",
  FLASHCARD: "single",
  CLOZE: "fill_blank",
  DRAG_DROP: "single",
};

export const KIND_LABEL: Record<ExerciseKind, string> = {
  single: "Alege răspunsul",
  true_false: "Adevărat / Fals",
  multiple: "Alege toate răspunsurile",
  fill_blank: "Completează",
  matching: "Potrivește",
  ordering: "Pune în ordine",
  image_choice: "Alege imaginea",
  classification: "Clasifică",
};

export interface ExerciseOption {
  label: string;
  imageUrl?: string | null;
}

// Schemă de răspuns corect, stocată în Question.answer (Json). Cheile de tip
// Record folosesc numere, dar sunt serializate ca string-uri în JSON.
export type AnswerScheme =
  | { kind: "single"; index: number }
  | { kind: "multiple"; indices: number[] }
  | { kind: "fill_blank"; accepted: string[] }
  | { kind: "matching"; pairs: Record<number, number>; leftCount: number }
  | { kind: "ordering"; order: number[] }
  | { kind: "classification"; buckets: Record<string, number[]> };

// Răspunsul trimis de utilizator, normalizat.
export type ExerciseUserAnswer =
  | { kind: "single"; index: number }
  | { kind: "true_false"; index: number }
  | { kind: "multiple"; indices: number[] }
  | { kind: "fill_blank"; text: string }
  | { kind: "matching"; pairs: Record<number, number> }
  | { kind: "ordering"; order: number[] }
  | { kind: "classification"; buckets: Record<string, number[]> };

export interface Exercise {
  id: string;
  kind: ExerciseKind;
  dbType: string;
  prompt: string;
  options: ExerciseOption[];
  correctIndex: number;
  answer: AnswerScheme | null;
  explanation?: string | null;
  conceptId?: string | null;
  concept?: string | null;
  difficulty?: number;
  /** Categorii pentru classification (afișate ca zone). */
  categories?: string[];
}

function toOption(raw: unknown): ExerciseOption {
  if (raw && typeof raw === "object") {
    const o = raw as { label?: unknown; imageUrl?: unknown };
    return {
      label: typeof o.label === "string" ? o.label : "",
      imageUrl: typeof o.imageUrl === "string" ? o.imageUrl : null,
    };
  }
  return { label: typeof raw === "string" ? raw : "", imageUrl: null };
}

function toOptions(raw: unknown): ExerciseOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toOption);
}

export function parseAnswerScheme(raw: unknown): AnswerScheme | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Partial<AnswerScheme>;
  const kind = a.kind;
  if (!kind || !EXERCISE_KINDS.includes(kind as ExerciseKind)) return null;
  switch (kind) {
    case "single":
      if (typeof a.index !== "number") return null;
      return { kind, index: a.index };
    case "multiple":
      if (!Array.isArray(a.indices) || a.indices.some((n) => typeof n !== "number")) return null;
      return { kind, indices: [...a.indices] };
    case "fill_blank":
      if (!Array.isArray(a.accepted) || a.accepted.some((s) => typeof s !== "string")) return null;
      return { kind, accepted: [...a.accepted] };
    case "ordering":
      if (!Array.isArray(a.order) || a.order.some((n) => typeof n !== "number")) return null;
      return { kind, order: [...a.order] };
    case "matching": {
      const pairs = a.pairs;
      if (!pairs || typeof pairs !== "object" || Array.isArray(pairs)) return null;
      const out: Record<number, number> = {};
      for (const [k, v] of Object.entries(pairs)) {
        if (typeof v !== "number") return null;
        const left = Number(k);
        if (!Number.isInteger(left)) return null;
        out[left] = v;
      }
      const leftCount = typeof (a as { leftCount?: unknown }).leftCount === "number" ? (a as { leftCount: number }).leftCount : Math.ceil(Object.keys(out).length);
      return { kind, pairs: out, leftCount };
    }
    case "classification": {
      const buckets = a.buckets;
      if (!buckets || typeof buckets !== "object" || Array.isArray(buckets)) return null;
      const out: Record<string, number[]> = {};
      for (const [k, v] of Object.entries(buckets)) {
        if (!Array.isArray(v) || v.some((n) => typeof n !== "number")) return null;
        out[k] = v;
      }
      return { kind, buckets: out };
    }
    default:
      return null;
  }
}

/** Construiește un Exercise canonic dintr-o întrebare DB (prisma shape). */
export function normalizeQuestion(q: {
  id: string;
  text: string;
  options: unknown;
  correctIndex: number;
  answer?: unknown;
  explanation?: string | null;
  type?: string;
  concept?: string | null;
  conceptId?: string | null;
  difficulty?: number | null;
  categories?: string[];
}): Exercise {
  const dbType = q.type ?? "SINGLE";
  const kind = KIND_BY_DB_TYPE[dbType] ?? "single";
  const options = toOptions(q.options);
  const parsed = parseAnswerScheme(q.answer);
  // Fallback legacy: răspunsul stă în correctIndex (sau în eticheta opțiunii corecte).
  const fallback: AnswerScheme =
    kind === "fill_blank"
      ? { kind: "fill_blank", accepted: [options[q.correctIndex]?.label ?? ""].filter(Boolean) }
      : { kind: "single", index: q.correctIndex ?? 0 };
  const answer = parsed ?? fallback;
  return {
    id: q.id,
    kind,
    dbType,
    prompt: q.text,
    options,
    correctIndex: q.correctIndex,
    answer,
    explanation: q.explanation ?? null,
    conceptId: q.conceptId ?? null,
    concept: q.concept ?? null,
    difficulty: q.difficulty ?? 1,
    categories: q.categories,
  };
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...new Set(a)].sort((x, y) => x - y);
  const sb = [...new Set(b)].sort((x, y) => x - y);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

function samePairs(a: Record<number, number>, b: Record<number, number>): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[Number(k)] === b[Number(k)]);
}

function sameBuckets(a: Record<string, number[]>, b: Record<string, number[]>): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Array.isArray(b[k]) && sameSet(a[k], b[k]));
}

function answerIndex(answer: ExerciseUserAnswer): number | null {
  if (answer.kind === "single" || answer.kind === "true_false") {
    return answer.index;
  }
  return null;
}

/** Normalizează textul pentru comparație (fără diacritice, lower-case, fără spații duble). */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Scorare pură, folosită identic pe client și pe server. */
export function checkAnswer(exercise: Exercise, answer: ExerciseUserAnswer | null): boolean {
  if (!answer) return false;
  const scheme = exercise.answer;
  if (!scheme) {
    // fallback legacy: compară pe correctIndex
    const idx = answerIndex(answer);
    return idx !== null && idx === exercise.correctIndex;
  }
  switch (exercise.kind) {
    case "single":
    case "true_false":
    case "image_choice": {
      if (!("index" in scheme) || typeof scheme.index !== "number") return false;
      const idx = answerIndex(answer);
      return idx !== null && idx === scheme.index;
    }
    case "fill_blank": {
      if (!("accepted" in scheme) || !Array.isArray(scheme.accepted) || answer.kind !== "fill_blank") return false;
      const norm = normalizeText(answer.text);
      return norm.length > 0 && scheme.accepted.some((a) => normalizeText(a) === norm);
    }
    case "multiple":
      if (!("indices" in scheme) || !Array.isArray(scheme.indices) || answer.kind !== "multiple") return false;
      return sameSet(scheme.indices, answer.indices);
    case "matching":
      if (!("pairs" in scheme) || typeof scheme.pairs !== "object" || answer.kind !== "matching") return false;
      return samePairs(scheme.pairs, answer.pairs);
    case "ordering":
      if (!("order" in scheme) || !Array.isArray(scheme.order) || answer.kind !== "ordering") return false;
      return (
        scheme.order.length === answer.order.length &&
        scheme.order.every((v, i) => v === answer.order[i])
      );
    case "classification":
      if (!("buckets" in scheme) || typeof scheme.buckets !== "object" || answer.kind !== "classification") return false;
      return sameBuckets(scheme.buckets, answer.buckets);
    default:
      return false;
  }
}

/** Normalizează payload-ul client pentru un kind de exercițiu. */
export function parseUserAnswer(kind: ExerciseKind, raw: unknown): ExerciseUserAnswer | null {
  switch (kind) {
    case "single":
    case "true_false":
    case "image_choice":
      if (typeof raw === "number") return { kind, index: raw } as ExerciseUserAnswer;
      return null;
    case "fill_blank":
      if (typeof raw === "string") return { kind, text: raw };
      return null;
    case "multiple": {
      if (Array.isArray(raw) && raw.every((n) => typeof n === "number")) {
        return { kind, indices: raw as number[] };
      }
      return null;
    }
    case "ordering": {
      if (Array.isArray(raw) && raw.every((n) => typeof n === "number")) {
        return { kind, order: raw as number[] };
      }
      return null;
    }
    case "matching": {
      if (Array.isArray(raw) && raw.every((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number")) {
        const pairs: Record<number, number> = {};
        for (const [l, r] of raw as [number, number][]) pairs[l] = r;
        return { kind, pairs };
      }
      return null;
    }
    case "classification": {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const buckets: Record<string, number[]> = {};
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          if (!Array.isArray(v) || !v.every((n) => typeof n === "number")) return null;
          buckets[k] = v as number[];
        }
        return { kind, buckets };
      }
      return null;
    }
  }
}

/** Eticheta unei opțiuni (A…H). */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** Adevărat / Fals: opțiuni ignorate, index 0 = Adevărat, 1 = Fals. */
export const TRUE_FALSE_OPTIONS: ExerciseOption[] = [
  { label: "Adevărat" },
  { label: "Fals" },
];