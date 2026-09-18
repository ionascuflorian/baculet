"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, isAdmin, requireAdmin, requirePermission, requireOwner, ADMIN_PERMISSIONS } from "@/lib/access";
import { resequenceStepOrders, syncLessonSteps } from "@/lib/lesson-steps";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// ─── AI settings (per-admin API key) ───────────────────────────
const aiSettingsSchema = z.object({
  provider: z.enum(["google", "openai", "anthropic", "openrouter"]).default("google"),
  apiKey: z.string().min(1),
  model: z.string().trim().optional().default(""),
});

export async function saveAiSettings(input: z.input<typeof aiSettingsSchema>) {
  const user = await requireAdmin();
  const data = aiSettingsSchema.parse(input);
  const { encryptApiKey } = await import("@/lib/ai-keys");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      aiProvider: data.provider,
      aiApiKeyEnc: encryptApiKey(data.apiKey),
      aiModel: data.model || null,
    },
  });
  revalidatePath("/admin/ai");
  return { ok: true };
}

export async function clearAiSettings() {
  const user = await requireAdmin();
  await prisma.user.update({
    where: { id: user.id },
    data: { aiProvider: null, aiApiKeyEnc: null, aiModel: null },
  });
  revalidatePath("/admin/ai");
  return { ok: true };
}

// ─── Site AI settings (Siera + theme generator, global) ────────
const siteAiSettingsSchema = z.object({
  provider: z.enum(["google", "openai", "anthropic", "openrouter"]).default("google"),
  apiKey: z.string().min(1),
  model: z.string().trim().min(1, "Scrie modelul dorit."),
});

export async function saveSiteAiSettings(input: z.input<typeof siteAiSettingsSchema>) {
  await requirePermission("MANAGE_SITE_AI");
  const data = siteAiSettingsSchema.parse(input);
  const { encryptApiKey } = await import("@/lib/ai-keys");
  await prisma.siteSetting.upsert({
    where: { key: "siteAiConfig" },
    update: { value: { provider: data.provider, apiKeyEnc: encryptApiKey(data.apiKey), model: data.model.trim() } },
    create: { key: "siteAiConfig", value: { provider: data.provider, apiKeyEnc: encryptApiKey(data.apiKey), model: data.model.trim() } },
  });
  revalidatePath("/admin/ai");
  return { ok: true };
}

export async function clearSiteAiSettings() {
  await requirePermission("MANAGE_SITE_AI");
  await prisma.siteSetting.deleteMany({ where: { key: "siteAiConfig" } });
  revalidatePath("/admin/ai");
  return { ok: true };
}

export interface TestAiResult {
  ok: boolean;
  ms: number;
  model: string;
  error?: string;
}

export type TestAiProvider = "google" | "openai" | "anthropic" | "openrouter";

export interface TestAiSettingsArgs {
  provider: TestAiProvider;
  apiKey: string;
  model: string;
}

const testAiSchema = z.object({
  provider: z.enum(["google", "openai", "anthropic", "openrouter"]).default("google"),
  apiKey: z.string().optional().default(""),
  model: z.string().trim().optional().default(""),
});

// Testează modelul scris în formularul de AI conținut (fără a salva).
export async function testAiSettings(input: TestAiSettingsArgs): Promise<TestAiResult> {
  const user = await requireAdmin();
  const data = testAiSchema.parse(input);
  const { buildLanguageModel, testLanguageModel } = await import("@/lib/ai-model");
  const { DEFAULT_MODELS } = await import("@/lib/ai-content/provider");
  const { decryptApiKey } = await import("@/lib/ai-keys");

  let apiKey = data.apiKey.trim();
  if (!apiKey && data.provider !== "google") {
    // Câmpul de cheie gol + config salvat pentru același provider: folosim cheia salvată.
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { aiProvider: true, aiApiKeyEnc: true },
    });
    if (dbUser?.aiApiKeyEnc && dbUser.aiProvider === data.provider) {
      try {
        apiKey = decryptApiKey(dbUser.aiApiKeyEnc);
      } catch {
        apiKey = "";
      }
    }
  }
  if (!apiKey && data.provider !== "google") {
    return { ok: false, ms: 0, model: data.model || "-", error: "Introdu cheia API a providerului." };
  }
  if (!apiKey) apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";

  const modelId = data.model.trim() || DEFAULT_MODELS[data.provider];
  const test = await testLanguageModel(buildLanguageModel(data.provider, apiKey, modelId));
  return {
    ok: test.ok,
    ms: test.ms,
    model: modelId,
    error: test.error,
  };
}

// Testează modelul scris în formularul de AI site (fără a salva).
export async function testSiteAiSettings(input: TestAiSettingsArgs): Promise<TestAiResult> {
  await requirePermission("MANAGE_SITE_AI");
  const data = testAiSchema.parse(input);
  const { buildLanguageModel, testLanguageModel } = await import("@/lib/ai-model");
  const { readSiteAiConfig } = await import("@/lib/site-ai");

  let apiKey = data.apiKey.trim();
  if (!apiKey && data.provider !== "google") {
    // Câmpul de cheie gol + config salvat pentru același provider: folosim cheia salvată.
    const config = await readSiteAiConfig();
    if (config?.provider === data.provider) apiKey = config.apiKey;
  }
  if (!apiKey && data.provider !== "google") {
    return { ok: false, ms: 0, model: data.model.trim() || "-", error: "Introdu cheia API a providerului." };
  }
  if (!apiKey) apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";

  const modelId = data.model.trim() || process.env.SIERA_MODEL || "gemini-3.5-flash-lite";
  const test = await testLanguageModel(buildLanguageModel(data.provider, apiKey, modelId));
  return {
    ok: test.ok,
    ms: test.ms,
    model: modelId,
    error: test.error,
  };
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
  await requirePermission("MANAGE_CONTENT");
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

  await prisma.$transaction([
    prisma.subjectProfile.deleteMany({ where: { subjectId: subject.id } }),
    prisma.subjectProfile.createMany({
      data: data.profiles.map((profile) => ({ subjectId: subject.id, profile })),
    }),
  ]);

  revalidatePath("/admin/materii");
  revalidatePath("/materii");
  revalidatePath("/dashboard");
  return { id: subject.id };
}

export async function deleteSubject(id: string) {
  await requirePermission("MANAGE_CONTENT");
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
  await requirePermission("MANAGE_CONTENT");
  const data = chapterSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.title);

  const payload = {
    title: data.title,
    slug,
    description: data.description,
    order: data.order,
  };

  let chapter;
  try {
    chapter = id
      ? await prisma.chapter.update({ where: { id }, data: payload })
      : await prisma.chapter.create({
          data: { ...payload, subjectId: data.subjectId },
        });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw new Error("Există deja un capitol cu acest slug în materie.");
    }
    throw err;
  }

  revalidatePath(`/admin/materii/${data.subjectId}`);
  revalidatePath("/materii");
  return { id: chapter.id };
}

export async function deleteChapter(id: string) {
  await requirePermission("MANAGE_CONTENT");
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
  difficulty: z.coerce.number().int().min(1).max(3).default(1),
});

export async function saveLesson(
  id: string | null,
  input: z.input<typeof lessonSchema>
) {
  await requirePermission("MANAGE_CONTENT");
  const data = lessonSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.title);

  let lesson;
  try {
    lesson = id
      ? await prisma.lesson.update({
          where: { id },
          data: {
            title: data.title,
            slug,
            content: data.content,
            videoUrl: data.videoUrl || null,
            pdfUrl: data.pdfUrl || null,
            order: data.order,
            difficulty: data.difficulty,
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
            difficulty: data.difficulty,
          },
        });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw new Error("Există deja o lecție cu acest slug în capitol.");
    }
    throw err;
  }

  // sincronizează pașii bite-sized din markdown (## secțiuni)
  await syncLessonSteps(lesson.id, data.content);

  // revalidare corectă (path-uri reale, nu literal cu [id])
  revalidatePath(`/admin/capitole/${data.chapterId}`);
  revalidatePath("/admin/materii");
  revalidatePath("/materii");
  return { id: lesson.id };
}

export async function deleteLesson(id: string) {
  await requirePermission("MANAGE_CONTENT");
  await prisma.lesson.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/materii");
}

// ─── Lesson sections (Hybrid Constructor) ──────────────────────
const sectionSchema = z.object({
  title: z.string().optional().nullable().default(null),
  content: z.string().min(1),
  stepType: z.string().optional().default("DESCOPERĂ"),
  minReadTime: z.coerce.number().int().min(0).default(15),
  quizId: z.string().nullable().optional().default(null),
});

async function nextStepOrder(lessonId: string) {
  const last = await prisma.lessonStep.findFirst({
    where: { lessonId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

async function renumberStepOrders(lessonId: string) {
  await resequenceStepOrders(lessonId);
}

export async function createSection(
  lessonId: string,
  input: z.input<typeof sectionSchema>
) {
  await requirePermission("MANAGE_CONTENT");
  const data = sectionSchema.parse(input);

  // quizId e unique pe LessonStep: un exercițiu nu poate fi folosit în două secțiuni
  if (data.quizId) {
    const taken = await prisma.lessonStep.findUnique({
      where: { quizId: data.quizId },
      select: { id: true, lessonId: true },
    });
    if (taken) {
      throw new Error("Acest exercițiu este deja atașat unei alte secțiuni.");
    }
  }

  const order = await nextStepOrder(lessonId);
  const step = await prisma.lessonStep.create({
    data: {
      lessonId,
      order,
      title: data.title ?? null,
      content: data.content,
      stepType: data.stepType,
      minReadTime: data.minReadTime,
      quizId: data.quizId ?? null,
      manual: true,
    },
  });

  await revalidateSectionPaths(lessonId);
  return { id: step.id };
}

export async function updateSection(
  stepId: string,
  lessonId: string,
  input: z.input<typeof sectionSchema>
) {
  await requirePermission("MANAGE_CONTENT");
  const data = sectionSchema.parse(input);

  const existing = await prisma.lessonStep.findUnique({
    where: { id: stepId },
    select: { lessonId: true, quizId: true },
  });
  if (!existing || existing.lessonId !== lessonId) throw new Error("Secțiune inexistentă");

  if (data.quizId && data.quizId !== existing.quizId) {
    const taken = await prisma.lessonStep.findUnique({
      where: { quizId: data.quizId },
      select: { id: true },
    });
    if (taken && taken.id !== stepId) {
      throw new Error("Acest exercițiu este deja atașat unei alte secțiuni.");
    }
  }

  await prisma.lessonStep.update({
    where: { id: stepId },
    data: {
      title: data.title ?? null,
      content: data.content,
      stepType: data.stepType,
      minReadTime: data.minReadTime,
      quizId: data.quizId ?? null,
      manual: true,
    },
  });

  await revalidateSectionPaths(lessonId);
  return { id: stepId };
}

export async function deleteSection(stepId: string, lessonId: string) {
  await requirePermission("MANAGE_CONTENT");
  const step = await prisma.lessonStep.findUnique({
    where: { id: stepId },
    select: { lessonId: true, quiz: { select: { id: true } } },
  });
  if (!step || step.lessonId !== lessonId) throw new Error("Secțiune inexistentă");

  await prisma.lessonStep.delete({ where: { id: stepId } });
  await renumberStepOrders(lessonId);

  await revalidateSectionPaths(lessonId);
  return { ok: true };
}

export async function reorderLessonSteps(lessonId: string, orderedIds: string[]) {
  await requirePermission("MANAGE_CONTENT");
  await resequenceStepOrders(lessonId, orderedIds);

  await revalidateSectionPaths(lessonId);
  return { ok: true };
}

// Generează/actualizează automat secțiunile lecției din conținutul ei (markdown).
// Cu paragraphFallback, textul fără anteturi ## se împarte pe paragrafe. Pașii
// manuali (din Constructor) sunt protejați, iar re-generarea e idempotentă.
export async function generateSectionsFromLesson(lessonId: string) {
  await requirePermission("MANAGE_CONTENT");
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, content: true },
  });
  if (!lesson) throw new Error("Lecția nu există.");

  await syncLessonSteps(lesson.id, lesson.content, { paragraphFallback: true });

  const count = await prisma.lessonStep.count({ where: { lessonId } });
  await revalidateSectionPaths(lessonId);
  return { count };
}

async function revalidateSectionPaths(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      slug: true,
      chapter: { select: { slug: true, subject: { select: { slug: true } } } },
    },
  });
  revalidatePath(`/admin/lectii/${lessonId}/constructor`);
  revalidatePath(`/admin/lectii/${lessonId}`);
  revalidatePath("/admin/materii");
  revalidatePath("/materii");
  revalidatePath("/dashboard");
  revalidatePath("/progres");
  if (lesson?.chapter?.subject?.slug && lesson.chapter.slug && lesson.slug) {
    revalidatePath(`/materii/${lesson.chapter.subject.slug}/${lesson.chapter.slug}/${lesson.slug}`);
  }
}

const quickQuestionSchema = z.object({
  text: z.string().min(2),
  options: z.array(z.string()).min(2),
  correctIndex: z.coerce.number().int().min(0).default(0),
  explanation: z.string().optional().default(""),
  type: z
    .enum([
      "SINGLE",
      "CLOZE",
      "FLASHCARD",
      "DRAG_DROP",
      "SINGLE_CHOICE",
      "TRUE_FALSE",
      "MULTIPLE_CHOICE",
      "FILL_BLANK",
      "MATCHING",
      "ORDERING",
      "IMAGE_CHOICE",
      "CLASSIFICATION",
    ])
    .default("SINGLE_CHOICE"),
  answer: z.unknown().optional(),
});

const quickQuizSchema = z.object({
  title: z.string().min(2),
  questions: z.array(quickQuestionSchema).min(1),
});

function validateQuickQuestion(q: z.infer<typeof quickQuestionSchema>) {
  if (q.type === "FILL_BLANK") {
    const accepted = (q.answer as { accepted?: unknown[] } | undefined)?.accepted ?? [];
    if (accepted.length === 0) {
      throw new Error("Pentru întrebarea de tip „Completează” adaugă măcar un răspuns acceptat.");
    }
  }
  if (q.type === "MULTIPLE_CHOICE") {
    const indices = (q.answer as { indices?: unknown[] } | undefined)?.indices ?? [];
    if (indices.length === 0) {
      throw new Error("Pentru întrebarea de tip „Alege toate” marchează cel puțin o variantă corectă.");
    }
  }
  if (q.correctIndex >= q.options.length) {
    throw new Error("Indexul răspunsului corect este în afara variantelor.");
  }
}

export async function createQuickQuiz(
  lessonId: string,
  input: z.input<typeof quickQuizSchema>
) {
  await requirePermission("MANAGE_CONTENT");
  const data = quickQuizSchema.parse(input);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      chapterId: true,
      chapter: { select: { subjectId: true } },
    },
  });
  if (!lesson) throw new Error("Lecția nu există");

  for (const q of data.questions) {
    validateQuickQuestion(q);
  }

  // slug unic pe materie
  let slug = slugify(data.title) || "exercitiu";
  let suffix = 1;
  while (
    await prisma.quiz.findUnique({
      where: { subjectId_slug: { subjectId: lesson.chapter.subjectId, slug } },
    })
  ) {
    slug = `${slugify(data.title) || "exercitiu"}-${suffix++}`;
  }

  const order = await nextStepOrder(lessonId);
  const quiz = await prisma.quiz.create({
    data: {
      subjectId: lesson.chapter.subjectId,
      chapterId: lesson.chapterId,
      title: data.title,
      slug,
      description: "Exercițiu creat rapid din Constructorul de lecție",
      difficulty: 1,
      published: true,
      order,
    },
  });
  await prisma.question.createMany({
    data: data.questions.map((q, i) => ({
      quizId: quiz.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      answer: q.answer ?? undefined,
      explanation: q.explanation || null,
      type: q.type as unknown as never,
      order: i,
    })),
  });

  revalidatePath("/admin/teste");
  revalidatePath("/materii");
  return { quizId: quiz.id };
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
  await requirePermission("MANAGE_QUIZZES");
  const data = quizSchema.parse(input);
  const slug = data.slug?.trim() || slugify(data.title);

  const quiz = id
    ? await prisma.quiz.update({
        where: { id },
        data: {
          chapterId: data.chapterId,
          title: data.title,
          slug,
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
  await requirePermission("MANAGE_QUIZZES");
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
  type: z.enum(["SINGLE", "CLOZE", "FLASHCARD", "DRAG_DROP"]).default("SINGLE"),
  concept: z.string().optional().default(""),
  order: z.coerce.number().int().default(0),
});

export async function saveQuestion(
  id: string | null,
  input: z.input<typeof questionSchema>,
  opts?: { revalidate?: string[] }
) {
  await requirePermission("MANAGE_QUIZZES");
  const data = questionSchema.parse(input);

  // validare correctIndex în limite
  if (data.correctIndex >= data.options.length) {
    throw new Error("Indexul răspunsului corect este în afara variantelor.");
  }

  const question = id
    ? await prisma.question.update({
        where: { id },
        data: {
          text: data.text,
          options: data.options,
          correctIndex: data.correctIndex,
          explanation: data.explanation || null,
          type: data.type as unknown as never,
          concept: data.concept || null,
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
          type: data.type as unknown as never,
          concept: data.concept || null,
          order: data.order,
        },
      });

  revalidatePath(`/admin/teste/${data.quizId}`);
  revalidatePath("/materii");
  const extra = opts?.revalidate ?? [];
  for (const p of extra) revalidatePath(p);
  return { id: question.id };
}

export async function deleteQuestion(id: string, opts?: { revalidate?: string[] }) {
  await requirePermission("MANAGE_QUIZZES");
  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/teste");
  const extra = opts?.revalidate ?? [];
  for (const p of extra) revalidatePath(p);
}

const generatedQuestionSchema = z.object({
  text: z.string().min(2),
  options: z.array(z.string()).min(2),
  correctIndex: z.coerce.number().int().min(0),
  explanation: z.string().optional().default(""),
  type: z.enum(["SINGLE", "CLOZE", "FLASHCARD", "DRAG_DROP"]).default("SINGLE"),
  concept: z.string().optional().default(""),
});

export async function saveGeneratedQuestions(
  quizId: string,
  inputs: z.input<typeof generatedQuestionSchema>[],
  opts?: { revalidate?: string[] }
) {
  await requirePermission("MANAGE_QUIZZES");
  const data = inputs.map((i) => generatedQuestionSchema.parse(i));

  const existingCount = await prisma.question.count({ where: { quizId } });
  await prisma.question.createMany({
    data: data.map((q, i) => ({
      quizId,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation || null,
      type: q.type as unknown as never,
      concept: q.concept || null,
      order: existingCount + i,
    })),
  });

  revalidatePath(`/admin/teste/${quizId}`);
  revalidatePath("/materii");
  const extra = opts?.revalidate ?? [];
  for (const p of extra) revalidatePath(p);
  return { count: data.length };
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
  await requirePermission("MANAGE_EXAMS");
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
  await requirePermission("MANAGE_EXAMS");
  await prisma.officialExam.delete({ where: { id } });
  revalidatePath("/admin/subiecte");
  revalidatePath("/subiecte-bac");
}

// ─── Admin management (priveleged: doar owner-ul) ──────────────
export async function makeAdmin(userId: string) {
  await requireOwner();
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) throw new Error("Contul nu a fost găsit.");
  if (target.role === "ADMIN") throw new Error("Contul este deja admin.");
  await prisma.user.update({
    where: { id: userId },
    data: { role: "ADMIN", permissions: ADMIN_PERMISSIONS },
  });
  revalidatePath("/admin/utilizatori");
}

export async function demoteAdmin(userId: string) {
  const actor = await requireOwner();
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isOwner: true },
  });
  if (!target) throw new Error("Contul nu a fost găsit.");
  if (target.role !== "ADMIN") throw new Error("Contul nu este admin.");
  // Owner-ul nu poate fi demovat; nici nu te poți demi singur.
  if (target.isOwner) throw new Error("Nu poți demova un owner.");
  if (target.id === actor.id) throw new Error("Nu te poți demova pe tine.");
  await prisma.user.update({
    where: { id: userId },
    data: { role: "USER", permissions: [], isOwner: false },
  });
  revalidatePath("/admin/utilizatori");
}

const adminPermissionsSchema = z.object({
  permissions: z.array(
    z.enum([
      "MANAGE_CONTENT",
      "MANAGE_QUIZZES",
      "MANAGE_EXAMS",
      "MANAGE_SITE_SETTINGS",
      "MANAGE_SITE_AI",
      "MANAGE_AI_CONTENT",
      "MANAGE_USERS",
    ])
  ),
  isOwner: z.boolean().default(false),
});

// Setează permisiunile și/sau statutul de owner pentru un admin (doar owner-ul).
export async function updateAdminPermissions(
  userId: string,
  input: z.input<typeof adminPermissionsSchema>
) {
  const actor = await requireOwner();
  const data = adminPermissionsSchema.parse(input);
  if (userId === actor.id && !data.isOwner) {
    throw new Error("Nu îți poți retrage propriul statut de owner.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isOwner: true },
  });
  if (!target) throw new Error("Contul nu a fost găsit.");
  if (target.role !== "ADMIN") throw new Error("Contul nu este admin.");

  // Protecție: ultimul owner nu poate fi dezactivat.
  if (target.isOwner && !data.isOwner) {
    const ownerCount = await prisma.user.count({ where: { role: "ADMIN", isOwner: true } });
    if (ownerCount <= 1) throw new Error("Trebuie să existe cel puțin un owner.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      // Owner-ul are implicit toate permisiunile.
      permissions: data.isOwner ? ADMIN_PERMISSIONS : data.permissions,
      isOwner: data.isOwner,
    },
  });
  revalidatePath("/admin/utilizatori");
  return { ok: true };
}

// ─── User deletion ─────────────────────────────────────────────
export async function deleteUser(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user || !isAdmin(user)) {
    return { ok: false, error: "Acces interzis." };
  }
  if (user.id === userId) {
    return { ok: false, error: "Nu poți șterge propriul cont." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { ok: false, error: "Contul nu a fost găsit." };
  }
  // Owner-ii și adminii pot fi șterși doar de owner.
  if (target.isOwner || target.role === "ADMIN") {
    const actor = await currentUser();
    if (!actor?.isOwner) {
      return { ok: false, error: "Acces interzis." };
    }
  }
  if (target.isOwner) {
    const ownerCount = await prisma.user.count({ where: { role: "ADMIN", isOwner: true } });
    if (ownerCount <= 1) {
      return { ok: false, error: "Nu poți șterge ultimul owner." };
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/utilizatori");
  return { ok: true };
}
