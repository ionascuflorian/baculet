import { prisma } from "@/lib/db";

export function parseLessonSteps(content: string): { title: string | null; content: string }[] {
  const sections: { title: string | null; content: string }[] = [];
  const lines = content.split("\n");
  let currentTitle: string | null = null;
  let buffer: string[] = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) {
      if (buffer.join("\n").trim() || currentTitle) {
        sections.push({ title: currentTitle, content: buffer.join("\n").trim() });
      }
      currentTitle = h2[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.join("\n").trim() || currentTitle) {
    sections.push({ title: currentTitle, content: buffer.join("\n").trim() });
  }
  if (sections.length === 0 && content.trim()) sections.push({ title: null, content: content.trim() });
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
        data: { title: s.title, content: s.content },
      });
    } else {
      await prisma.lessonStep.create({
        data: { lessonId, title: s.title, content: s.content, order: i },
      });
    }
  }
}
