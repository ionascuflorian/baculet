"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Acces interzis");
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ─── Subjects ──────────────────────────────────────────────────
const subjectSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional().default(""),
  icon: z.string().optional().default("📘"),
  color: z.string().optional().default("#58cc02"),
  order: z.coerce.number().int().default(0),
  profiles: z.array(z.enum(["REAL", "HUMAN", "TECH"])).default([]),
});

export async function saveSubject(
  id: string | null,
  input: z.input<typeof subjectSchema>
) {
  await requireAdmin();
  const data = subjectSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.name);
  const payload = {
    name: data.name,
    slug,
    description: data.description,
    icon: data.icon,
    color: data.color,
    order: data.order,
  };

  const subject = id
    ? await prisma.subject.update({ where: { id }, data: payload })
    : await prisma.subject.create({ data: payload });

  await prisma.subjectProfile.deleteMany({ where: { subjectId: subject.id } });
  await prisma.subjectProfile.createMany({
    data: data.profiles.map((profile) => ({ subjectId: subject.id, profile })),
  });

  revalidatePath("/admin/materii");
  revalidatePath("/materii");
  revalidatePath("/dashboard");
  return { id: subject.id };
}

export async function deleteSubject(id: string) {
  await requireAdmin();
  await prisma.subject.delete({ where: { id } });
  revalidatePath("/admin/materii");
  revalidatePath("/materii");
  revalidatePath("/dashboard");
}

// ─── Chapters ──────────────────────────────────────────────────
const chapterSchema = z.object({
  subjectId: z.string(),
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional().default(""),
  order: z.coerce.number().int().default(0),
});

export async function saveChapter(
  id: string | null,
  input: z.input<typeof chapterSchema>
) {
  await requireAdmin();
  const data = chapterSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.title);

  const chapter = id
    ? await prisma.chapter.update({
        where: { id },
        data: { title: data.title, description: data.description, order: data.order },
      })
    : await prisma.chapter.create({
        data: {
          subjectId: data.subjectId,
          title: data.title,
          slug,
          description: data.description,
          order: data.order,
        },
      });

  revalidatePath("/admin/materii/[id]", "page");
  revalidatePath("/materii");
  return { id: chapter.id };
}

export async function deleteChapter(id: string) {
  await requireAdmin();
  await prisma.chapter.delete({ where: { id } });
  revalidatePath("/admin/materii");
  revalidatePath("/materii");
}

// ─── Lessons ───────────────────────────────────────────────────
const lessonSchema = z.object({
  chapterId: z.string(),
  title: z.string().min(2),
  slug: z.string().optional(),
  content: z.string().default(""),
  videoUrl: z.string().optional().default(""),
  pdfUrl: z.string().optional().default(""),
  order: z.coerce.number().int().default(0),
});

export async function saveLesson(
  id: string | null,
  input: z.input<typeof lessonSchema>
) {
  await requireAdmin();
  const data = lessonSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.title);

  const lesson = id
    ? await prisma.lesson.update({
        where: { id },
        data: {
          title: data.title,
          content: data.content,
          videoUrl: data.videoUrl || null,
          pdfUrl: data.pdfUrl || null,
          order: data.order,
        },
      })
    : await prisma.lesson.create({
        data: {
          chapterId: data.chapterId,
          title: data.title,
          slug,
          content: data.content,
          videoUrl: data.videoUrl || null,
          pdfUrl: data.pdfUrl || null,
          order: data.order,
        },
      });

  revalidatePath("/admin/capitole/[id]", "page");
  revalidatePath("/materii");
  return { id: lesson.id };
}

export async function deleteLesson(id: string) {
  await requireAdmin();
  await prisma.lesson.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/materii");
}

// ─── Quizzes ───────────────────────────────────────────────────
const quizSchema = z.object({
  subjectId: z.string(),
  chapterId: z.string().nullable().default(null),
  title: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional().default(""),
  difficulty: z.coerce.number().int().min(1).max(3).default(1),
  published: z.boolean().default(true),
  order: z.coerce.number().int().default(0),
});

export async function saveQuiz(
  id: string | null,
  input: z.input<typeof quizSchema>
) {
  await requireAdmin();
  const data = quizSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.title);

  const quiz = id
    ? await prisma.quiz.update({
        where: { id },
        data: {
          chapterId: data.chapterId,
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          published: data.published,
          order: data.order,
        },
      })
    : await prisma.quiz.create({
        data: {
          subjectId: data.subjectId,
          chapterId: data.chapterId,
          title: data.title,
          slug,
          description: data.description,
          difficulty: data.difficulty,
          published: data.published,
          order: data.order,
        },
      });

  revalidatePath("/admin/teste");
  revalidatePath("/materii");
  return { id: quiz.id };
}

export async function deleteQuiz(id: string) {
  await requireAdmin();
  await prisma.quiz.delete({ where: { id } });
  revalidatePath("/admin/teste");
  revalidatePath("/materii");
}

const questionSchema = z.object({
  quizId: z.string(),
  text: z.string().min(2),
  options: z.array(z.string()).min(2),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().optional().default(""),
  order: z.coerce.number().int().default(0),
});

export async function saveQuestion(
  id: string | null,
  input: z.input<typeof questionSchema>
) {
  await requireAdmin();
  const data = questionSchema.parse(input);

  const question = id
    ? await prisma.question.update({
        where: { id },
        data: {
          text: data.text,
          options: data.options,
          correctIndex: data.correctIndex,
          explanation: data.explanation || null,
          order: data.order,
        },
      })
    : await prisma.question.create({
        data: {
          quizId: data.quizId,
          text: data.text,
          options: data.options,
          correctIndex: data.correctIndex,
          explanation: data.explanation || null,
          order: data.order,
        },
      });

  revalidatePath("/admin/teste/[id]", "page");
  return { id: question.id };
}

export async function deleteQuestion(id: string) {
  await requireAdmin();
  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/teste");
}

// ─── Official exams ────────────────────────────────────────────
const examSchema = z.object({
  subjectId: z.string(),
  year: z.coerce.number().int().min(2000).max(2100),
  session: z.enum(["SUMMER", "AUTUMN", "SPECIAL"]),
  profile: z.enum(["REAL", "HUMAN", "TECH"]),
  title: z.string().min(2),
  pdfUrl: z.string().min(4),
  solutionUrl: z.string().optional().default(""),
  order: z.coerce.number().int().default(0),
});

export async function saveExam(
  id: string | null,
  input: z.input<typeof examSchema>
) {
  await requireAdmin();
  const data = examSchema.parse(input);

  const exam = id
    ? await prisma.officialExam.update({
        where: { id },
        data: {
          year: data.year,
          session: data.session,
          profile: data.profile,
          title: data.title,
          pdfUrl: data.pdfUrl,
          solutionUrl: data.solutionUrl || null,
          order: data.order,
        },
      })
    : await prisma.officialExam.create({
        data: {
          subjectId: data.subjectId,
          year: data.year,
          session: data.session,
          profile: data.profile,
          title: data.title,
          pdfUrl: data.pdfUrl,
          solutionUrl: data.solutionUrl || null,
          order: data.order,
        },
      });

  revalidatePath("/admin/subiecte");
  revalidatePath("/subiecte-bac");
  return { id: exam.id };
}

export async function deleteExam(id: string) {
  await requireAdmin();
  await prisma.officialExam.delete({ where: { id } });
  revalidatePath("/admin/subiecte");
  revalidatePath("/subiecte-bac");
}

// ─── Admin bootstrap (first user becomes admin) ────────────────
export async function makeAdmin(userId: string) {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
  revalidatePath("/admin/utilizatori");
}

// ─── User deletion ─────────────────────────────────────────────
export async function deleteUser(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, error: "Acces interzis." };
  }
  if (session.user.id === userId) {
    return { ok: false, error: "Nu poți șterge propriul cont." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, error: "Contul nu a fost găsit." };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/utilizatori");
  return { ok: true };
}
