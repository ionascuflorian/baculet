import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export interface GeneratedQuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface GeneratedQuizInput {
  subjectSlug: string;
  title: string;
  description?: string;
  difficulty?: number;
  questions: GeneratedQuizQuestion[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function createQuizForUser(
  userId: string,
  input: GeneratedQuizInput
): Promise<{ href: string; title: string; slug: string }> {
  const subject = await prisma.subject.findUnique({
    where: { slug: input.subjectSlug },
  });
  if (!subject) {
    throw new Error(`Materia "${input.subjectSlug}" nu există.`);
  }
  if (!input.questions.length) {
    throw new Error("Testul nu are întrebări.");
  }

  const base = slugify(input.title) || "test-siera";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const quiz = await prisma.quiz.create({
    data: {
      subjectId: subject.id,
      userId,
      title: input.title,
      slug,
      description: input.description || null,
      difficulty: Math.min(3, Math.max(1, input.difficulty ?? 1)),
      published: true,
      questions: {
        create: input.questions.map((q, i) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || null,
          order: i,
        })),
      },
    },
    select: { title: true, slug: true },
  });

  revalidatePath(`/materii/${subject.slug}`);
  return { href: `/teste/${quiz.slug}`, title: quiz.title, slug: quiz.slug };
}
