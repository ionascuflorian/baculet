"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdminOrThrow } from "@/lib/ai-content/provider";
import { canGenerate } from "@/lib/ai-content/rate";
import {
  generateCurriculumDraft,
  generateLessonDraft,
  generateQuizDraft,
  generateCheckpointDraft,
  validateDraft,
  regenerateLessonStep,
  regenerateQuestion,
  filterValidRefs,
  buildUnitContext,
} from "@/lib/ai-content/content";
import { deleteSourceFile } from "@/lib/ai-content/storage";
import {
  findDuplicates,
  publishLesson,
  publishQuiz,
  publishCheckpoint,
} from "@/lib/ai-content/publish";
import {
  lessonDraftSchema,
  quizDraftSchema,
  checkpointDraftSchema,
  type ItemDraft,
  type LessonDraft,
  type QuizDraft,
  type CheckpointDraft,
  type DraftVersionEntry,
  type SourceRef,
} from "@/lib/ai-content/types";

// ── Utilitare ────────────────────────────────────────────────────────────────
async function logActivity(projectId: string, userId: string, action: string, detail?: unknown) {
  await prisma.projectActivity.create({
    data: { projectId, userId, action, detail: detail ?? undefined },
  });
}

async function bumpVersion(itemId: string, draft: unknown, note?: string) {
  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: { version: true, versions: true },
  });
  if (!item) return;
  const versions = (item.versions as DraftVersionEntry[] | null) ?? [];
  versions.push({
    version: item.version,
    at: new Date().toISOString(),
    draft: draft as ItemDraft,
    note: note ?? "editare manuală",
  });
  await prisma.contentItem.update({
    where: { id: itemId },
    data: { version: item.version + 1, versions: versions.slice(-10) as unknown as Prisma.InputJsonValue },
  });
}

// ── Query-uri (pentru paginile server) ───────────────────────────────────────
export async function listProjects() {
  await requireAdminOrThrow();
  return prisma.contentProject.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      subject: { select: { name: true } },
      _count: { select: { sources: true, items: true, nodes: true } },
    },
  });
}

export async function loadProjectDetail(projectId: string) {
  await requireAdminOrThrow();
  return prisma.contentProject.findUnique({
    where: { id: projectId },
    include: {
      subject: { select: { name: true } },
      sources: { orderBy: { createdAt: "asc" } },
      nodes: { orderBy: { order: "asc" } },
      items: { orderBy: { updatedAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
      jobs: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { chunks: true } },
    },
  });
}

// ── Proiecte ─────────────────────────────────────────────────────────────────
const projectInput = z.object({
  name: z.string().min(2).max(120),
  subjectId: z.string().min(1),
  bacYear: z.number().int().min(2000).max(2100).nullish(),
  examType: z.string().max(40).nullish(),
  description: z.string().max(500).nullish(),
});

export async function createProject(input: unknown) {
  const userId = await requireAdminOrThrow();
  const data = projectInput.parse(input);
  const project = await prisma.contentProject.create({
    data: {
      name: data.name.trim(),
      subjectId: data.subjectId,
      bacYear: data.bacYear ?? null,
      examType: data.examType ?? null,
      description: data.description ?? null,
      status: "DRAFT",
    },
    select: { id: true },
  });
  await logActivity(project.id, userId, "proiect:creat", { name: data.name });
  revalidatePath("/admin/ai-content");
  return { ok: true, id: project.id };
}

export async function updateProject(input: unknown) {
  const userId = await requireAdminOrThrow();
  const body = z
    .object({
      id: z.string().min(1),
      name: z.string().min(2).max(120).optional(),
      bacYear: z.number().int().min(2000).max(2100).nullish(),
      examType: z.string().max(40).nullish(),
      description: z.string().max(500).nullish(),
    })
    .parse(input);
  if (body.name) {
    await prisma.contentProject.update({
      where: { id: body.id },
      data: {
        name: body.name.trim(),
        ...(body.bacYear !== undefined ? { bacYear: body.bacYear } : {}),
        ...(body.examType !== undefined ? { examType: body.examType } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
    });
    await logActivity(body.id, userId, "proiect:editat", { name: body.name });
  }
  revalidatePath(`/admin/ai-content/projects/${body.id}`);
  return { ok: true };
}

export async function deleteProject(id: string) {
  await requireAdminOrThrow();
  if (!id || typeof id !== "string") return { ok: false, error: "ID invalid." };
  const sources = await prisma.contentSource.findMany({
    where: { projectId: id },
    select: { storageKey: true },
  });
  await Promise.all(sources.map((s) => deleteSourceFile(s.storageKey).catch(() => {})));
  await prisma.contentProject.delete({ where: { id } });
  revalidatePath("/admin/ai-content");
  return { ok: true };
}

// ── Surse ────────────────────────────────────────────────────────────────────
export async function setSourcePriority(input: unknown) {
  await requireAdminOrThrow();
  const { sourceId, priority } = z
    .object({ sourceId: z.string().min(1), priority: z.enum(["OFFICIAL", "HIGH", "NORMAL", "REFERENCE"]) })
    .parse(input);
  const source = await prisma.contentSource.update({
    where: { id: sourceId },
    data: { priority },
    select: { projectId: true },
  });
  revalidatePath(`/admin/ai-content/projects/${source.projectId}`);
  return { ok: true };
}

export async function deleteSource(input: unknown) {
  await requireAdminOrThrow();
  const { sourceId } = z.object({ sourceId: z.string().min(1) }).parse(input);
  const source = await prisma.contentSource.findUnique({ where: { id: sourceId } });
  if (source) {
    await deleteSourceFile(source.storageKey).catch(() => {});
    await prisma.contentSource.delete({ where: { id: sourceId } });
    revalidatePath(`/admin/ai-content/projects/${source.projectId}`);
  }
  return { ok: true };
}

// ── Curriculum ───────────────────────────────────────────────────────────────
export async function generateCurriculum(input: unknown) {
  const userId = await requireAdminOrThrow();
  if (!(await canGenerate(userId))) {
    return { ok: false, error: "Ai depășit limita de generări pe oră (30). Încearcă mai târziu." };
  }
  const { projectId } = z.object({ projectId: z.string().min(1) }).parse(input);
  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
    include: { subject: { select: { name: true } }, nodes: true },
  });
  if (!project) return { ok: false, error: "Proiect inexistent" };

  await logActivity(projectId, userId, "curriculum:generare-inceput", {});
  await prisma.contentProject.update({ where: { id: projectId }, data: { status: "ANALYZING" } });

  try {
    const output = await generateCurriculumDraft({
      projectId,
      subjectName: project.subject.name,
      bacYear: project.bacYear,
      existingStructure: project.nodes.length
        ? project.nodes
            .filter((n) => n.kind === "CHAPTER")
            .map((n) => ({
              title: n.title,
              units: project.nodes
                .filter((u) => u.parentId === n.id)
                .map((u) => {
                  const children = project.nodes.filter((c) => c.parentId === u.id);
                  return { title: u.title, concepts: children.map((c) => c.title) };
                }),
            }))
            .map((c) => `Capitol: ${c.title}\n  ${c.units.map((u) => `- ${u.title}${u.concepts.length ? ` (${u.concepts.join(", ")})` : ""}`).join("\n  ")}`)
            .join("\n")
        : undefined,
    });

    // Înlocuim nodurile care NU sunt manuale; ale manuale supraviețuiesc.
    const manualIds = project.nodes
      .filter((n) => n.manual)
      .map((n) => n.id);
    // Pentru V1: reconstruim tot arborele, păstrând nodurile manuale ca orfane (re-atașate sub „Manual").
    await prisma.$transaction(async (tx) => {
      await tx.curriculumNode.deleteMany({
        where: { projectId, id: { notIn: manualIds }, parentId: null },
      });

      let order = 0;
      for (const chapter of output.chapters) {
        const chapterNode = manualIds.length
          ? await tx.curriculumNode.create({
              data: {
                projectId,
                kind: "CHAPTER",
                parentId: null,
                title: chapter.title,
                description: chapter.description ?? null,
                order: order++,
              },
              select: { id: true },
            })
          : await tx.curriculumNode.create({
              data: {
                projectId,
                kind: "CHAPTER",
                parentId: null,
                title: chapter.title,
                description: chapter.description ?? null,
                order: order++,
              },
              select: { id: true },
            });

        for (const unit of chapter.units) {
          const unitRefs = await filterValidRefs(projectId, unit.references ?? []);
          const unitNode = await tx.curriculumNode.create({
            data: {
              projectId,
              kind: "UNIT",
              parentId: chapterNode.id,
              title: unit.title,
              description: unit.description ?? null,
              order: 0,
              evidence: unitRefs.length ? unitRefs : undefined,
            },
            select: { id: true },
          });
          for (const concept of unit.concepts) {
            const conceptRefs = await filterValidRefs(projectId, concept.references ?? []);
            await tx.curriculumNode.create({
              data: {
                projectId,
                kind: "CONCEPT",
                parentId: unitNode.id,
                title: concept.name,
                description: concept.description ?? null,
                order: 0,
                evidence: conceptRefs.length ? conceptRefs : undefined,
              },
            });
          }
        }
      }
    });

    await prisma.contentProject.update({ where: { id: projectId }, data: { status: "READY_FOR_REVIEW" } });
    await logActivity(projectId, userId, "curriculum:generat", { chapters: output.chapters.length });
    revalidatePath(`/admin/ai-content/projects/${projectId}`);
    return { ok: true, chapters: output.chapters.length };
  } catch (err) {
    await prisma.contentProject.update({ where: { id: projectId }, data: { status: "FAILED" } });
    await logActivity(projectId, userId, "curriculum:eroare", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Eroare la generarea planului de curriculum.",
    };
  }
}

export async function addCurriculumNode(input: unknown) {
  const userId = await requireAdminOrThrow();
  const body = z
    .object({
      projectId: z.string().min(1),
      kind: z.enum(["CHAPTER", "UNIT", "CONCEPT"]),
      parentId: z.string().nullish(),
      title: z.string().min(2).max(140),
    })
    .parse(input);
  const last = await prisma.curriculumNode.findFirst({
    where: { projectId: body.projectId, parentId: body.parentId ?? null },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const node = await prisma.curriculumNode.create({
    data: {
      projectId: body.projectId,
      kind: body.kind,
      parentId: body.parentId ?? null,
      title: body.title.trim(),
      order: (last?.order ?? 0) + 1,
      manual: true,
    },
    select: { id: true },
  });
  await logActivity(body.projectId, userId, "curriculum:nod-adaugat", { title: body.title });
  revalidatePath(`/admin/ai-content/projects/${body.projectId}`);
  return { ok: true, id: node.id };
}

export async function saveCurriculumNode(input: unknown) {
  await requireAdminOrThrow();
  const body = z
    .object({
      nodeId: z.string().min(1),
      title: z.string().min(2).max(140),
      description: z.string().max(500).nullable(),
      order: z.number().int().min(0).optional(),
    })
    .parse(input);
  const node = await prisma.curriculumNode.update({
    where: { id: body.nodeId },
    data: { title: body.title.trim(), description: body.description, manual: true, ...(body.order !== undefined ? { order: body.order } : {}) },
    select: { projectId: true },
  });
  revalidatePath(`/admin/ai-content/projects/${node.projectId}`);
  return { ok: true };
}

export async function deleteCurriculumNode(input: unknown) {
  await requireAdminOrThrow();
  const { nodeId } = z.object({ nodeId: z.string().min(1) }).parse(input);
  const node = await prisma.curriculumNode.findUnique({ where: { id: nodeId } });
  if (node) {
    await prisma.curriculumNode.delete({ where: { id: nodeId } });
    revalidatePath(`/admin/ai-content/projects/${node.projectId}`);
  }
  return { ok: true };
}

// ── Generare itemi (lecție / quiz / checkpoint) ─────────────────────────────
const generateItemInput = z.object({
  projectId: z.string().min(1),
  nodeId: z.string().min(1),
  type: z.enum(["LESSON", "QUIZ", "CHECKPOINT"]),
  title: z.string().max(200).nullish(),
});

export async function generateItem(input: unknown) {
  const userId = await requireAdminOrThrow();
  if (!(await canGenerate(userId))) {
    return { ok: false, error: "Ai depășit limita de generări pe oră (30). Încearcă mai târziu." };
  }
  const body = generateItemInput.parse(input);
  const project = await prisma.contentProject.findUnique({
    where: { id: body.projectId },
    include: { subject: { select: { name: true } } },
  });
  const node = await prisma.curriculumNode.findUnique({
    where: { id: body.nodeId },
    include: { parent: true, children: true },
  });
  if (!project || !node) return { ok: false, error: "Proiect sau nod inexistent" };

  if (node.kind === "CHAPTER") {
    return { ok: false, error: "Atașează conținutul unei Unități (depinde de planul de curriculum)." };
  }

  const concepts =
    node.kind === "UNIT"
      ? node.children.map((c) => c.title)
      : node.kind === "CONCEPT"
        ? [node.title]
        : [];

  const defaultTitle =
    body.type === "QUIZ"
      ? `Quiz: ${node.title}`
      : body.type === "CHECKPOINT"
        ? `Checkpoint: ${node.title}`
        : `Lecția: ${node.title}`;
  const title = body.title?.trim() || defaultTitle;

  const item = await prisma.contentItem.create({
    data: {
      projectId: body.projectId,
      nodeId: body.nodeId,
      type: body.type,
      status: "DRAFT",
      title,
      draft: {},
      versions: [{ version: 1, at: new Date().toISOString(), draft: {}, note: "pornită generarea" }],
    },
    select: { id: true },
  });

  const job = await prisma.generationJob.create({
    data: { projectId: body.projectId, itemId: item.id, userId, kind: body.type === "LESSON" ? "LESSON" : body.type === "QUIZ" ? "QUIZ" : "CHECKPOINT", status: "RUNNING", startedAt: new Date(), params: { nodeId: body.nodeId, title } },
  });

  try {
    const base = {
      projectId: body.projectId,
      subjectName: project.subject.name,
      unitNodeId: node.id,
      unitTitle: node.title,
      unitDescription: node.description ?? undefined,
      concepts,
    };
    let draft: ItemDraft;
    let refs: unknown[] = [];

    if (body.type === "QUIZ") {
      const r = await generateQuizDraft({ ...base, quizTitle: title, questionCount: 6, difficulty: 2 });
      draft = r.draft;
      refs = r.references as unknown as unknown[];
    } else if (body.type === "CHECKPOINT") {
      const r = await generateCheckpointDraft({ ...base, checkpointTitle: title, questionCount: 8 });
      draft = r.draft;
      refs = r.references as unknown as unknown[];
    } else {
      const r = await generateLessonDraft({ ...base, lessonTitle: title, difficulty: 2 });
      draft = r.draft;
      refs = r.references as unknown as unknown[];
    }

    await prisma.contentItem.update({
      where: { id: item.id },
      data: { draft: draft as unknown as Prisma.InputJsonValue, status: "READY_FOR_REVIEW", sourceRefs: refs.length ? (refs as unknown as Prisma.InputJsonValue) : undefined },
    });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "DONE", finishedAt: new Date(), result: { itemId: item.id, title } },
    });
    await logActivity(body.projectId, userId, body.type === "LESSON" ? "item:lectie-generata" : body.type === "QUIZ" ? "item:quiz-generat" : "item:checkpoint-generat", { id: item.id, title });
    revalidatePath(`/admin/ai-content/projects/${body.projectId}`);
    return { ok: true, id: item.id };
  } catch (err) {
    const message = friendlyAiError(err);
    await prisma.contentItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: message, finishedAt: new Date() },
    });
await logActivity(body.projectId, userId, "item:eroare", { id: item.id, error: message });
    return { ok: false, error: message };
  }
}

// Convertește erorile tehnice în mesaje utile utilizatorului.
function friendlyAiError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Eroare la generare";
  if (message.startsWith("No object generated")) {
    return "Modelul AI nu a produs un răspuns valid de această dată. Reîncearcă; dacă persistă, schimbă modelul din Setări.";
  }
  if (message.startsWith("AI_APICallError") || message.includes("429") || message.includes("rate limit")) {
    return "Modelul AI a atins o limită de rată. Așteaptă puțin și încearcă din nou.";
  }
  return message;
}

// ── Editare manuală draft + versiuni ─────────────────────────────────────────
export async function updateItemDraft(input: unknown) {
  await requireAdminOrThrow();
  const body = z
    .object({
      itemId: z.string().min(1),
      draft: z.unknown(),
      note: z.string().max(300).nullish(),
    })
    .parse(input);
  const item = await prisma.contentItem.findUnique({
    where: { id: body.itemId },
    select: { id: true, type: true, draft: true },
  });
  if (!item) return { ok: false, error: "Item inexistent" };
  let parsed: unknown;
  if (item.type === "LESSON") parsed = lessonDraftSchema.parse(body.draft);
  else if (item.type === "QUIZ") parsed = quizDraftSchema.parse(body.draft);
  else parsed = checkpointDraftSchema.parse(body.draft);

  await bumpVersion(item.id, item.draft as ItemDraft, body.note ?? "editare manuală");
  await prisma.contentItem.update({
    where: { id: body.itemId },
    data: { draft: parsed as unknown as Prisma.InputJsonValue, status: "NEEDS_REVIEW" },
  });
  revalidatePath(`/admin/ai-content/projects/*`);
  return { ok: true };
}

// ── Regenerare localizată (pas din lecție / întrebare din quiz) ─────────────
export async function regenerateItemPart(input: unknown) {
  const userId = await requireAdminOrThrow();
  if (!(await canGenerate(userId))) {
    return { ok: false, error: "Ai depășit limita de generări pe oră (30). Încearcă mai târziu." };
  }
  const body = z
    .object({
      itemId: z.string().min(1),
      part: z.enum(["step", "question"]),
      index: z.number().int().min(0),
      instruction: z.string().min(3).max(400),
    })
    .parse(input);

  const item = await prisma.contentItem.findUnique({
    where: { id: body.itemId },
    include: { project: { select: { id: true } }, node: true },
  });
  if (!item) return { ok: false, error: "Item inexistent" };

  const unitContext = item.node ? await buildUnitContext(item.node.id) : "";
  const hits = await (await import("@/lib/ai-content/retrieval")).searchProjectChunks(item.project.id, item.title, { limit: 5 });

  const prevDraft = item.draft as ItemDraft;
  let nextDraft;
  try {
    if (body.part === "step") {
      const lesson = lessonDraftSchema.parse(prevDraft);
      if (!lesson.steps[body.index]) return { ok: false, error: "Pas inexistent" };
      const replacement = await regenerateLessonStep({
        stepIndex: body.index,
        current: lesson.steps[body.index],
        instruction: body.instruction,
        references: hits,
        unitContext,
      });
      lesson.steps[body.index] = replacement;
      nextDraft = lesson;
    } else {
      const quizDraftCheck = (() => {
        try {
          return quizDraftSchema.parse(prevDraft);
        } catch {
          try {
            return checkpointDraftSchema.parse(prevDraft);
          } catch {
            return null;
          }
        }
      })();
      if (!quizDraftCheck || !quizDraftCheck.questions[body.index]) {
        return { ok: false, error: "Întrebare inexistentă în draft" };
      }
      const replacement = await regenerateQuestion({
        qIndex: body.index,
        current: quizDraftCheck.questions[body.index],
        instruction: body.instruction,
        references: hits,
        unitContext,
      });
      quizDraftCheck.questions[body.index] = replacement;
      nextDraft = quizDraftCheck;
    }

    await bumpVersion(item.id, prevDraft, `regenerat: ${body.instruction}`);
    await prisma.contentItem.update({ where: { id: item.id }, data: { draft: nextDraft as unknown as Prisma.InputJsonValue, status: "NEEDS_REVIEW" } });
    await logActivity(item.project.id, userId, `item:${body.part}-regenerat`, { itemId: item.id, index: body.index });
    revalidatePath(`/admin/ai-content/projects/${item.project.id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? friendlyAiError(err) : "Eroare la regenerare." };
  }
}

// ── Validare AI ──────────────────────────────────────────────────────────────
export async function validateItem(input: unknown) {
  const userId = await requireAdminOrThrow();
  if (!(await canGenerate(userId))) {
    return { ok: false, error: "Ai depășit limita de validări pe oră (30). Încearcă mai târziu." };
  }
  const { itemId } = z.object({ itemId: z.string().min(1) }).parse(input);
  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    include: { project: { select: { id: true } }, node: true },
  });
  if (!item) return { ok: false, error: "Item inexistent" };

  await prisma.contentItem.update({ where: { id: itemId }, data: { status: "VALIDATING" } });
  try {
    const curriculumContext = item.node ? await buildUnitContext(item.node.id) : "";
    const result = await validateDraft({
      projectId: item.project.id,
      itemType: item.type.toLowerCase(),
      title: item.title,
      draft: item.draft,
      sourceRefs: ((item.sourceRefs as unknown[] | null) ?? []) as SourceRef[],
      curriculumContext,
    });
    await prisma.contentItem.update({ where: { id: itemId }, data: { validation: result as unknown as object, status: "NEEDS_REVIEW" } });
    await logActivity(item.project.id, userId, "item:validat", { itemId, score: result.overallScore });
    revalidatePath(`/admin/ai-content/projects/${item.project.id}`);
    return { ok: true, validation: result };
  } catch (err) {
    await prisma.contentItem.update({ where: { id: itemId }, data: { status: "NEEDS_REVIEW" } });
    return { ok: false, error: err instanceof Error ? friendlyAiError(err) : "Eroare la validare." };
  }
}

export async function approveItem(input: unknown) {
  const userId = await requireAdminOrThrow();
  const { itemId } = z.object({ itemId: z.string().min(1) }).parse(input);
  const item = await prisma.contentItem.findUnique({
    where: { id: itemId },
    select: { projectId: true, title: true },
  });
  if (!item) return { ok: false, error: "Item inexistent" };
  await prisma.contentItem.update({
    where: { id: itemId },
    data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
  });
  await logActivity(item.projectId, userId, "item:aprobat", { title: item.title });
  revalidatePath(`/admin/ai-content/projects/${item.projectId}`);
  return { ok: true };
}

export async function rejectItem(input: unknown) {
  const userId = await requireAdminOrThrow();
  const body = z
    .object({ itemId: z.string().min(1), note: z.string().max(500).nullish() })
    .parse(input);
  const item = await prisma.contentItem.findUnique({
    where: { id: body.itemId },
    select: { projectId: true, title: true },
  });
  if (!item) return { ok: false, error: "Item inexistent" };
  await prisma.contentItem.update({
    where: { id: body.itemId },
    data: { status: "NEEDS_REVIEW", note: body.note ?? null },
  });
  await logActivity(item.projectId, userId, "item:respins", { title: item.title, note: body.note ?? null });
  revalidatePath(`/admin/ai-content/projects/${item.projectId}`);
  return { ok: true };
}

// ── Publicare în sistemul live ───────────────────────────────────────────────
export async function publishItem(input: unknown) {
  const userId = await requireAdminOrThrow();
  const body = z
    .object({ itemId: z.string().min(1), ignoreDuplicates: z.boolean().optional() })
    .parse(input);
  const item = await prisma.contentItem.findUnique({
    where: { id: body.itemId },
    include: { project: { select: { id: true, subjectId: true } }, node: true },
  });
  if (!item) return { ok: false, error: "Item inexistent" };
  if (item.status !== "APPROVED") {
    return { ok: false, error: "Doar itemele aprobate pot fi publicate. Aprobă mai întâi draft-ul." };
  }
  if (item.node?.kind === "CHAPTER") {
    return { ok: false, error: "Atașează conținutul unei Unități din plan." };
  }

  // Rezolvăm nodurile unite → capitol.
  const unitNode = item.node;
  const chapterNode = item.node?.parentId
    ? await prisma.curriculumNode.findUnique({ where: { id: item.node.parentId } })
    : null;
  if (!unitNode || !chapterNode) {
    return { ok: false, error: "Planul de curriculum nu are unitate/capitol pentru acest item." };
  }

  const duplicates = await findDuplicates(item.project, item.title);
  if (duplicates.length > 0 && !body.ignoreDuplicates) {
    return { ok: true, duplicates, published: false };
  }

  const job = await prisma.generationJob.create({
    data: { projectId: item.project.id, itemId: item.id, userId, kind: "VALIDATION", status: "RUNNING", startedAt: new Date(), params: { action: "publish", itemId: item.id } },
  });

  try {
    let result;
    if (item.type === "LESSON") {
      const draft = lessonDraftSchema.parse(item.draft) as LessonDraft;
      result = await publishLesson(item, draft, chapterNode, unitNode, item.project);
    } else if (item.type === "QUIZ") {
      const draft = quizDraftSchema.parse(item.draft) as QuizDraft;
      result = await publishQuiz(item, draft, item.project, unitNode, chapterNode);
    } else {
      const draft = checkpointDraftSchema.parse(item.draft) as CheckpointDraft;
      result = await publishCheckpoint(item, draft, item.project, chapterNode, unitNode);
    }

    await prisma.contentItem.update({
      where: { id: item.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        targetChapterId: result.chapterId ?? null,
        targetUnitId: result.unitId ?? null,
        targetLessonId: result.lessonId ?? null,
        targetQuizId: result.quizId ?? null,
        targetCheckpointId: result.checkpointId ?? null,
      },
    });
    await prisma.generationJob.update({ where: { id: job.id }, data: { status: "DONE", finishedAt: new Date(), result: result as unknown as Prisma.InputJsonValue } });
    await logActivity(item.project.id, userId, "item:publicat", { title: item.title, result });
    revalidatePath(`/admin/ai-content/projects/${item.project.id}`);
    revalidatePath(`/admin/materii`);
    return { ok: true, published: true, result };
  } catch (err) {
    await prisma.generationJob.update({ where: { id: job.id }, data: { status: "FAILED", error: err instanceof Error ? err.message : "eroare", finishedAt: new Date() } });
    await logActivity(item.project.id, userId, "item:publish-eroare", { title: item.title, error: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: err instanceof Error ? err.message : "Eroare la publicare." };
  }
}