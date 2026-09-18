import { prisma } from "@/lib/db";

// Tipurile interactive canonice ale lecțiilor; conținutul legacy (DESCOPERĂ etc.)
// rămâne vizibil, dar pașii noi se creează pe formatul interactiv.
export const STEP_TYPES = [
  "INTRO",
  "MICRO_LESSON",
  "EXAMPLE",
  "QUICK_EXERCISE",
  "APPLY",
  "RECALL",
  "MINI_TEST",
] as const;

const FALLBACK_STEP_TYPES = [
  "MICRO_LESSON",
  "MICRO_LESSON",
  "EXAMPLE",
  "QUICK_EXERCISE",
  "APPLY",
  "RECALL",
] as const;

export function inferStepType(index: number, title: string | null): string {
  if (title) {
    const t = title.toLowerCase();
    if (t.includes("descoper")) return "MICRO_LESSON";
    if (t.includes("înțeleg") || t.includes("inteleg")) return "MICRO_LESSON";
    if (t.includes("exemplu")) return "EXAMPLE";
    if (t.includes("încearc") || t.includes("incearca")) return "QUICK_EXERCISE";
    if (t.includes("exers")) return "QUICK_EXERCISE";
    if (t.includes("aplic")) return "APPLY";
    if (t.includes("recapitul")) return "RECALL";
    if (t.includes("mini-test") || t.includes("minitest") || t.includes("verifică-ți")) return "MINI_TEST";
    if (t.includes("obiectiv") || t.includes("învățăm") || t.includes("la sfârșit")) return "INTRO";
  }
  return FALLBACK_STEP_TYPES[index % FALLBACK_STEP_TYPES.length] ?? "MICRO_LESSON";
}

export function parseLessonSteps(content: string): { title: string | null; content: string; stepType: string }[] {
  const sections: { title: string | null; content: string; stepType: string }[] = [];
  const lines = content.split("\n");
  let currentTitle: string | null = null;
  let buffer: string[] = [];
  let idx = 0;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) {
      if (buffer.join("\n").trim() || currentTitle) {
        const title = currentTitle;
        sections.push({ title, content: buffer.join("\n").trim(), stepType: inferStepType(idx, title) });
        idx++;
      }
      currentTitle = h2[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.join("\n").trim() || currentTitle) {
    const title = currentTitle;
    sections.push({ title, content: buffer.join("\n").trim(), stepType: inferStepType(idx, title) });
  }
  if (sections.length === 0 && content.trim()) sections.push({ title: null, content: content.trim(), stepType: "MICRO_LESSON" });
  return sections.filter((s) => s.content.length > 0);
}

// Titlu scurt pentru o secțiune generată din conținut: primul rând, fără marcaje markdown.
function titleFromFirstLine(text: string): string | null {
  const first = text.split("\n").map((l) => l.trim()).find((l) => l.length > 0 && !l.startsWith("---"));
  if (!first) return null;
  const clean = first.replace(/^#+\s*/, "").replace(/^(?:[-*]|>\s*)/, "").replace(/[*_`[\]()~]/g, "").trim();
  if (!clean) return null;
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

// Fallback pentru conținut fără anteturi ##: fiecare paragraf devine o secțiune.
export function parseParagraphSteps(content: string): { title: string | null; content: string; stepType: string }[] {
  const blocks = content
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !/^---+$/.test(b));
  return blocks.map((block, idx) => {
    const title = titleFromFirstLine(block);
    return { title, content: block, stepType: inferStepType(idx, title) };
  });
}

export function parseLessonStepsSmart(
  content: string,
  opts?: { paragraphFallback?: boolean }
): { title: string | null; content: string; stepType: string }[] {
  const hasHeadings = (content.match(/^##\s+/gm)?.length ?? 0) > 0;
  if (!hasHeadings && opts?.paragraphFallback) {
    const parsed = parseParagraphSteps(content);
    if (parsed.length > 0) return parsed;
  }
  return parseLessonSteps(content);
}

export const STEP_ORDER_SHIFT = 100000;

/**
 * Resecventează 0..n toți pașii unei lecții. Deplasarea temporară cu
 * STEP_ORDER_SHIFT evită conflictele pe @@unique([lessonId, order]).
 * Fără `orderedIds`, păstrează ordinea curentă; cu `orderedIds`, impune-o.
 */
export async function resequenceStepOrders(lessonId: string, orderedIds?: string[]) {
  const steps = await prisma.lessonStep.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  if (orderedIds) {
    const valid = new Set(steps.map((s) => s.id));
    if (orderedIds.length !== steps.length || orderedIds.some((id) => !valid.has(id))) {
      throw new Error("Lista de secțiuni e incompletă.");
    }
  }
  for (const s of steps) {
    await prisma.lessonStep.update({ where: { id: s.id }, data: { order: s.order + STEP_ORDER_SHIFT } });
  }
  const ordering = orderedIds ?? steps.map((s) => s.id);
  for (let i = 0; i < ordering.length; i++) {
    await prisma.lessonStep.update({ where: { id: ordering[i] }, data: { order: i } });
  }
}

export async function syncLessonSteps(
  lessonId: string,
  content: string,
  opts?: { paragraphFallback?: boolean }
) {
  const steps = parseLessonStepsSmart(content, opts);

  const existing = await prisma.lessonStep.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  });

  // pașii manuali (creați/editați în Constructor) sunt protejați: nu se rescriu, nu se șterg
  const manualSteps = existing.filter((s) => s.manual);
  const nonManual = existing.filter((s) => !s.manual).sort((a, b) => a.order - b.order);

  // faza 1: mută temporar pașii auto pentru a evita conflicte pe @@unique([lessonId, order])
  for (const s of nonManual) {
    await prisma.lessonStep.update({ where: { id: s.id }, data: { order: s.order + STEP_ORDER_SHIFT } });
  }

  // sloturile de order rămase după ce manualii și-au ocupat pozițiile
  const occupied = new Set(manualSteps.map((s) => s.order));
  const freeOrders: number[] = [];
  let cursor = 0;
  for (let i = 0; i < steps.length; i++) {
    while (occupied.has(cursor)) cursor++;
    freeOrders.push(cursor);
    occupied.add(cursor);
    cursor++;
  }

  // faza 2: actualizează/crează pașii auto pe pozițiile libere
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const order = freeOrders[i];
    const existingStep = nonManual[i];
    if (existingStep) {
      await prisma.lessonStep.update({
        where: { id: existingStep.id },
        data: { title: s.title, content: s.content, stepType: s.stepType, order },
      });
    } else {
      await prisma.lessonStep.create({
        data: { lessonId, title: s.title, content: s.content, order, stepType: s.stepType, manual: false },
      });
    }
  }

  // pașii auto rămași în exces: șterge-i, dar păstrează-i pe cei cu quiz atașat (compensați la final)
  const orphans = nonManual.slice(steps.length);
  const deleteIds = orphans.filter((s) => s.quizId === null).map((s) => s.id);
  if (deleteIds.length > 0) {
    await prisma.lessonStep.deleteMany({ where: { id: { in: deleteIds } } });
  }
  const keepQuizSteps = orphans.filter((s) => s.quizId !== null);
  if (keepQuizSteps.length > 0) {
    for (const s of keepQuizSteps) {
      while (occupied.has(cursor)) cursor++;
      await prisma.lessonStep.update({ where: { id: s.id }, data: { order: cursor } });
      occupied.add(cursor);
      cursor++;
    }
  }
}
