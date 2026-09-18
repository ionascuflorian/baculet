// Publicarea draft-urilor aprobate în modelele educaționale LIVE.
// Toate scrierile se fac într-o singură $transaction; orice eroare → rollback.
import { prisma } from "@/lib/db";
import { slugifyName } from "@/lib/username";
import type { ContentItem, CurriculumNode, QuestionType } from "@/generated/prisma/client";
import type {
  LessonDraft,
  QuizDraft,
  CheckpointDraft,
  QuestionDraft,
  LessonStepDraft,
} from "./types";

export interface PublishResult {
  lessonId?: string;
  quizId?: string;
  checkpointId?: string;
  chapterId?: string;
  unitId?: string;
}

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const slug = slugifyName(base) || "continut";
  let candidate = slug;
  let n = 1;
  while (await exists(candidate)) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

// ── Rezolvarea link-urilor către conținut live ───────────────────────────────
async function resolveChapterTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  project: { subjectId: string },
  chapterNode: CurriculumNode
): Promise<{ id: string }> {
  if (chapterNode.mappedId) {
    const existing = await tx.chapter.findUnique({ where: { id: chapterNode.mappedId } });
    if (existing) return { id: existing.id };
  }
  const base = await tx.chapter.findFirst({
    where: { subjectId: project.subjectId, title: chapterNode.title },
    select: { id: true, slug: true },
  });
  if (base) {
    await tx.curriculumNode.update({ where: { id: chapterNode.id }, data: { mappedId: base.id } });
    return { id: base.id };
  }
  const slug = await uniqueSlug(chapterNode.title, (s) =>
    tx.chapter.findFirst({ where: { subjectId: project.subjectId, slug: s } }).then(Boolean)
  );
  return tx.chapter.create({
    data: {
      subjectId: project.subjectId,
      title: chapterNode.title,
      description: chapterNode.description ?? null,
      slug,
    },
    select: { id: true },
  });
}

async function resolveUnitTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  chapterId: string,
  unitNode: CurriculumNode,
  type: "LESSON" | "CHECKPOINT" | "RECAP" | "DIAGNOSTIC" = "LESSON"
): Promise<{ id: string }> {
  if (unitNode.mappedId) {
    const existing = await tx.unit.findUnique({ where: { id: unitNode.mappedId } });
    if (existing) return { id: existing.id };
  }
  const base = await tx.unit.findFirst({
    where: { chapterId, title: unitNode.title },
    select: { id: true, slug: true },
  });
  if (base) {
    await tx.curriculumNode.update({ where: { id: unitNode.id }, data: { mappedId: base.id } });
    return { id: base.id };
  }
  const slug = await uniqueSlug(unitNode.title, (s) =>
    tx.unit.findFirst({ where: { chapterId, slug: s } }).then(Boolean)
  );
  return tx.unit.create({
    data: { chapterId, title: unitNode.title, description: unitNode.description ?? null, slug, type },
    select: { id: true },
  });
}

async function createQuestions(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  quizId: string,
  questions: QuestionDraft[],
  conceptSlugs: string[] = []
): Promise<void> {
  const concepts = conceptSlugs.length
    ? await tx.concept.findMany({ where: { id: { in: conceptSlugs } }, select: { id: true, slug: true } })
    : [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const concept = q.concept ? concepts.find((c) => c.slug === q.concept) : undefined;
    await tx.question.create({
      data: {
        quizId,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex ?? 0,
        answer: q.answer ?? undefined,
        explanation: q.explanation || null,
        type: q.type as QuestionType,
        difficulty: q.difficulty ?? 1,
        concept: concept ? undefined : (q.concept ?? null),
        conceptId: concept?.id ?? null,
        order: i,
      },
    });
  }
}

// ── Publicare per tip ─────────────────────────────────────────────────────────
export async function publishLesson(
  item: ContentItem,
  draft: LessonDraft,
  chapterNode: CurriculumNode,
  unitNode: CurriculumNode,
  project: { subjectId: string }
): Promise<PublishResult> {
  return prisma.$transaction(async (tx) => {
    const chapter = await resolveChapterTx(tx, project, chapterNode);
    const unit = await resolveUnitTx(tx, chapter.id, unitNode, "LESSON");

    const slug = await uniqueSlug(draft.title, (s) =>
      tx.lesson.findFirst({ where: { chapterId: chapter.id, slug: s } }).then(Boolean)
    );
    const lesson = await tx.lesson.create({
      data: {
        chapterId: chapter.id,
        unitId: unit.id,
        title: draft.title,
        slug,
        content: draft.content || draft.description || "",
        objective: draft.objective ?? null,
        estimatedMinutes: draft.estimatedMinutes ?? 15,
        order: item.version,
        difficulty: draft.difficulty ?? 1,
      },
      select: { id: true },
    });

    // Concepte atașate lecției
    const conceptIds: string[] = [];
    for (let i = 0; i < draft.concepts.length; i++) {
      const c = draft.concepts[i];
      const cSlug = await uniqueSlug(c.name, (s) =>
        tx.concept.findFirst({ where: { lessonId: lesson.id, slug: s } }).then(Boolean)
      );
      const created = await tx.concept.create({
        data: { lessonId: lesson.id, name: c.name, slug: cSlug, description: c.description ?? null, order: i },
        select: { id: true },
      });
      conceptIds.push(created.id);
    }

    // Pași
    for (let i = 0; i < draft.steps.length; i++) {
      const step = draft.steps[i];
      let quizId: string | undefined;
      if ((step.quiz?.length ?? 0) > 0) {
        const qSlug = await uniqueSlug(step.title || draft.title, (s) =>
          tx.quiz.findFirst({ where: { subjectId: project.subjectId, slug: s } }).then(Boolean)
        );
        const quiz = await tx.quiz.create({
          data: {
            subjectId: project.subjectId,
            chapterId: chapter.id,
            title: step.title || `${draft.title} — exercițiu`,
            slug: qSlug,
            description: null,
            difficulty: draft.difficulty ?? 1,
            published: true,
          },
          select: { id: true },
        });
        await createQuestions(tx, quiz.id, step.quiz ?? [], conceptIds);
        quizId = quiz.id;
      }
      const stepType = step.type || "DESCOPERĂ";
      await tx.lessonStep.create({
        data: {
          lessonId: lesson.id,
          title: step.title ?? null,
          content: step.content,
          order: i,
          stepType,
          quizId: quizId ?? null,
          minReadTime: step.minReadTime ?? 15,
          manual: true,
        },
      });
    }

    await tx.curriculumNode.update({ where: { id: unitNode.id }, data: { mappedId: unit.id } });
    return { lessonId: lesson.id, chapterId: chapter.id, unitId: unit.id };
  });
}

export async function publishQuiz(
  item: ContentItem,
  draft: QuizDraft,
  project: { subjectId: string; id: string },
  unitNode: CurriculumNode | null,
  chapterNode: CurriculumNode | null
): Promise<PublishResult> {
  return prisma.$transaction(async (tx) => {
    let chapterId: string | null = null;
    let unitId: string | null = null;
    if (chapterNode) {
      const chapter = await resolveChapterTx(tx, project, chapterNode);
      chapterId = chapter.id;
    }
    if (unitNode && chapterId) {
      const unit = await resolveUnitTx(tx, chapterId, unitNode, "LESSON");
      unitId = unit.id;
    }

    const slug = await uniqueSlug(draft.title, (s) =>
      tx.quiz.findFirst({ where: { subjectId: project.subjectId, slug: s } }).then(Boolean)
    );
    const quiz = await tx.quiz.create({
      data: {
        subjectId: project.subjectId,
        chapterId,
        title: draft.title,
        slug,
        description: draft.description ?? null,
        difficulty: draft.difficulty ?? 1,
        published: true,
      },
      select: { id: true },
    });
    await createQuestions(tx, quiz.id, draft.questions);
    return { quizId: quiz.id, chapterId: chapterId ?? undefined, unitId: unitId ?? undefined };
  });
}

export async function publishCheckpoint(
  item: ContentItem,
  draft: CheckpointDraft,
  project: { subjectId: string },
  chapterNode: CurriculumNode,
  unitNode: CurriculumNode
): Promise<PublishResult> {
  return prisma.$transaction(async (tx) => {
    const chapter = await resolveChapterTx(tx, project, chapterNode);
    const unit = await resolveUnitTx(tx, chapter.id, unitNode, "CHECKPOINT");

    const cpSlug = await uniqueSlug(draft.title, (s) =>
      tx.checkpoint.findFirst({ where: { slug: s } }).then(Boolean)
    );
    const checkpoint = await tx.checkpoint.create({
      data: { chapterId: chapter.id, unitId: unit.id, title: draft.title, slug: cpSlug },
      select: { id: true },
    });
    await tx.unit.update({ where: { id: unit.id }, data: { type: "CHECKPOINT" } });

    const qSlug = await uniqueSlug(draft.quizTitle, (s) =>
      tx.quiz.findFirst({ where: { subjectId: project.subjectId, slug: s } }).then(Boolean)
    );
    const quiz = await tx.quiz.create({
      data: {
        subjectId: project.subjectId,
        chapterId: chapter.id,
        title: draft.quizTitle,
        slug: qSlug,
        description: draft.description ?? `Checkpoint — ${draft.title}`,
        difficulty: 2,
        published: true,
      },
      select: { id: true },
    });
    await createQuestions(tx, quiz.id, draft.questions);

    await tx.curriculumNode.update({ where: { id: unitNode.id }, data: { mappedId: unit.id } });
    return { checkpointId: checkpoint.id, quizId: quiz.id, chapterId: chapter.id, unitId: unit.id };
  });
}

// ── Duplicate detection înainte de publish ────────────────────────────────────
export async function findDuplicates(
  project: { subjectId: string },
  title: string
): Promise<
  {
    target: "lesson" | "quiz" | "unit" | "chapter";
    id: string;
    title: string;
    location: string;
  }[]
> {
  const q = title.toLowerCase();
  const [lessons, quizzes, units, chapters] = await Promise.all([
    prisma.lesson.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, chapter: { select: { title: true } } },
      take: 5,
    }),
    prisma.quiz.findMany({
      where: { subjectId: project.subjectId, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, chapter: { select: { title: true } } },
      take: 5,
    }),
    prisma.unit.findMany({
      where: { chapter: { subjectId: project.subjectId }, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, chapter: { select: { title: true } } },
      take: 5,
    }),
    prisma.chapter.findMany({
      where: { subjectId: project.subjectId, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true },
      take: 5,
    }),
  ]);
  return [
    ...lessons.map((l) => ({ target: "lesson" as const, id: l.id, title: l.title, location: l.chapter.title || "materie" })),
    ...quizzes.map((quiz) => ({ target: "quiz" as const, id: quiz.id, title: quiz.title, location: quiz.chapter?.title || "materie" })),
    ...units.map((u) => ({ target: "unit" as const, id: u.id, title: u.title, location: u.chapter.title || "materie" })),
    ...chapters.map((ch) => ({ target: "chapter" as const, id: ch.id, title: ch.title, location: "materie" })),
  ].slice(0, 8);
}

// Ajutor de tip pentru pași (folosit în acțiuni).
export function asStepDraft(s: unknown): LessonStepDraft | null {
  if (!s || typeof s !== "object") return null;
  const step = s as Partial<LessonStepDraft>;
  return { ...step } as LessonStepDraft;
}