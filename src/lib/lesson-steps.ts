import { prisma } from "@/lib/db";

export const STEP_TYPES = [
  "DESCOPERĂ",
  "ÎNȚELEGE",
  "VEZI UN EXEMPLU",
  "ÎNCEARCĂ",
  "EXERSEAZĂ",
  "APLICĂ",
  "RECAPITULEAZĂ",
] as const;

export function inferStepType(index: number, title: string | null): string {
  if (title) {
    const t = title.toLowerCase();
    if (t.includes("descoper")) return "DESCOPERĂ";
    if (t.includes("înțeleg") || t.includes("inteleg")) return "ÎNȚELEGE";
    if (t.includes("exemplu")) return "VEZI UN EXEMPLU";
    if (t.includes("încearc") || t.includes("incearca")) return "ÎNCEARCĂ";
    if (t.includes("exersez") || t.includes("exers")) return "EXERSEAZĂ";
    if (t.includes("aplic")) return "APLICĂ";
    if (t.includes("recapitul")) return "RECAPITULEAZĂ";
  }
  return STEP_TYPES[index % STEP_TYPES.length] ?? "DESCOPERĂ";
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
  if (sections.length === 0 && content.trim()) sections.push({ title: null, content: content.trim(), stepType: "DESCOPERĂ" });
  return sections.filter((s) => s.content.length > 0);
}

export async function syncLessonSteps(lessonId: string, content: string) {
  const steps = parseLessonSteps(content);
  // șterge pașii în exces
  await prisma.lessonStep.deleteMany({
    where: { lessonId, order: { gte: steps.length } },
  });
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const existing = await prisma.lessonStep.findUnique({
      where: { lessonId_order: { lessonId, order: i } },
    });
    if (existing) {
      await prisma.lessonStep.update({
        where: { id: existing.id },
        data: { title: s.title, content: s.content, stepType: s.stepType },
      });
    } else {
      await prisma.lessonStep.create({
        data: { lessonId, title: s.title, content: s.content, order: i, stepType: s.stepType },
      });
    }
  }
}
