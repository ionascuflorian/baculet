import { prisma } from "@/lib/db";
import { masteryLevel } from "@/lib/mastery";

export type UnitStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "MASTERED" | "NEEDS_REVIEW";

export interface UnitWithStatus {
  id: string;
  title: string;
  slug: string;
  order: number;
  type: string;
  description: string | null;
  lessons: { id: string; title: string; slug: string }[];
  concepts: { id: string; name: string; slug: string }[];
  status: UnitStatus;
  progress: number; // 0-100
  masteryAvg: number | null;
}

export async function getLearningPathForChapter(userId: string, chapterId: string): Promise<UnitWithStatus[]> {
  const units = await prisma.unit.findMany({
    where: { chapterId },
    orderBy: { order: "asc" },
    include: {
      lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, slug: true } },
      concepts: { select: { id: true, name: true, slug: true } },
    },
  });

  if (units.length === 0) {
    // fallback: dacă încă nu există Units (date vechi), construim din Lessons
    const lessons = await prisma.lesson.findMany({ where: { chapterId }, orderBy: { order: "asc" }, select: { id: true, title: true, slug: true } });
    // le mapăm ca unități virtuale
    const prog = await prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessons.map((l) => l.id) } } });
    const done = new Set(prog.map((p) => p.lessonId));
    return lessons.map((l, idx) => {
      const prevDone = idx === 0 || done.has(lessons[idx - 1].id);
      const isDone = done.has(l.id);
      let status: UnitStatus = "AVAILABLE";
      if (!prevDone && !isDone) status = "LOCKED";
      else if (isDone) status = "COMPLETED";
      else if (idx === 0 || prevDone) status = "AVAILABLE";
      return {
        id: l.id,
        title: l.title,
        slug: l.slug,
        order: idx,
        type: "LESSON",
        description: null,
        lessons: [l],
        concepts: [],
        status,
        progress: isDone ? 100 : 0,
        masteryAvg: null,
      };
    });
  }

  // progrese existente
  const unitIds = units.map((u) => u.id);
  const lessonIds = units.flatMap((u) => u.lessons.map((l) => l.id));
  const [unitProgress, lessonProgress, conceptProgress] = await Promise.all([
    prisma.userUnitProgress.findMany({ where: { userId, unitId: { in: unitIds } } }),
    prisma.lessonProgress.findMany({ where: { userId, lessonId: { in: lessonIds } } }),
    prisma.userConceptProgress.findMany({ where: { userId, conceptId: { in: units.flatMap((u) => u.concepts.map((c) => c.id)) } } }),
  ]);

  const unitProgMap = new Map(unitProgress.map((p) => [p.unitId, p]));
  const doneLessons = new Set(lessonProgress.map((p) => p.lessonId));
  const conceptMap = new Map(conceptProgress.map((p) => [p.conceptId, p.mastery]));

  let foundFirstAvailable = false;

  return units.map((u, idx) => {
    const prevUnit = idx > 0 ? units[idx - 1] : null;
    const prevStatus = idx === 0 ? "COMPLETED" : ((): UnitStatus => {
      const prevProg = unitProgMap.get(prevUnit!.id);
      // checkpoint/recap cu NEEDS_REVIEW nu blochează următorul (soft)
      if (prevProg?.status === "COMPLETED" || prevProg?.status === "MASTERED" || prevProg?.status === "NEEDS_REVIEW") return "COMPLETED";
      const prevLessons = prevUnit!.lessons;
      const prevDone = prevLessons.length === 0 ? true : prevLessons.every((l) => doneLessons.has(l.id));
      // dacă prev e checkpoint/recap fără progres, consideră prevDone ca mai sus
      if (prevUnit!.type === "CHECKPOINT" || prevUnit!.type === "RECAP") {
        if (prevProg) return prevProg.status === "LOCKED" ? "LOCKED" : "COMPLETED";
        // fără progres dar prevDone true (fără lecții) -> disponibil
        return prevDone ? "COMPLETED" : "LOCKED";
      }
      if (prevDone) return "COMPLETED";
      return "LOCKED";
    })();

    const isLocked = prevStatus === "LOCKED";
    const lessonsDone = u.lessons.filter((l) => doneLessons.has(l.id)).length;
    const totalLessons = u.lessons.length || (u.type === "LESSON" ? 1 : 0);
    const progress = totalLessons ? Math.round((lessonsDone / totalLessons) * 100) : 0;
    const hasStarted = lessonsDone > 0 && lessonsDone < totalLessons;
    const isCompleted = totalLessons > 0 ? lessonsDone === totalLessons : false;

    // mastery avg pentru unitate
    let masteryAvg: number | null = null;
    if (u.concepts.length > 0) {
      const vals = u.concepts.map((c) => conceptMap.get(c.id) ?? 0);
      masteryAvg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }

    // dacă unitatea are progres salvat (checkpoint/recap), folosește-l
    const saved = unitProgMap.get(u.id);
    let status: UnitStatus;
    if (isLocked) status = "LOCKED";
    else if (saved && (u.type === "CHECKPOINT" || u.type === "RECAP")) {
      status = saved.status as UnitStatus;
    } else if (u.type === "CHECKPOINT" || u.type === "RECAP") {
      // fără progres încă
      status = "AVAILABLE";
    } else if (isCompleted) {
      if (masteryAvg !== null && masteryAvg >= 80) status = "MASTERED";
      else if (masteryAvg !== null && masteryAvg < 60) status = "NEEDS_REVIEW";
      else status = "COMPLETED";
    } else if (hasStarted) status = "IN_PROGRESS";
    else {
      if (!foundFirstAvailable && !isLocked) {
        foundFirstAvailable = true;
        status = "AVAILABLE";
      } else {
        status = isLocked ? "LOCKED" : "AVAILABLE";
      }
    }

    if (status === "COMPLETED" && masteryAvg !== null && masteryAvg < 60) status = "NEEDS_REVIEW";

    const finalProgress = saved && (u.type === "CHECKPOINT" || u.type === "RECAP") ? saved.progress : progress;

    return {
      id: u.id,
      title: u.title,
      slug: u.slug,
      order: u.order,
      type: u.type,
      description: u.description,
      lessons: u.lessons,
      concepts: u.concepts,
      status,
      progress: finalProgress,
      masteryAvg,
    };
  });
}

export function getStatusMeta(status: UnitStatus) {
  switch (status) {
    case "LOCKED": return { label: "Blocat", icon: "🔒", color: "feather" };
    case "AVAILABLE": return { label: "Disponibil", icon: "●", color: "accent" };
    case "IN_PROGRESS": return { label: "În desfășurare", icon: "●", color: "warning" };
    case "COMPLETED": return { label: "Finalizat", icon: "✓", color: "success" };
    case "MASTERED": return { label: "Stăpânit", icon: "🏆", color: "success" };
    case "NEEDS_REVIEW": return { label: "De revizuit", icon: "↻", color: "warning" };
  }
}
