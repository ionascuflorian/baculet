import { prisma } from "@/lib/db";
import { getLearningPathForChapter } from "@/lib/learning-path";
import { getDueReviews } from "@/lib/spaced-repetition";

export type NextActionType = "CONTINUE_LESSON" | "REVIEW_WEAK" | "REVIEW_SCHEDULED" | "NEXT_LESSON" | "CHECKPOINT" | "PRACTICE" | "DIAGNOSTIC" | "START_PATH";

export interface NextAction {
  type: NextActionType;
  title: string;
  description: string;
  href: string;
  meta?: string;
  priority: number;
}

export async function getNextBestActionForSubject(userId: string, subjectSlug: string): Promise<NextAction | null> {
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    include: { chapters: { orderBy: { order: "asc" }, select: { id: true, slug: true, title: true } } },
  });
  if (!subject) return null;

  // 1. diagnostic: dacă user nu are niciun progres pe materie, sugerează diagnostic 5-10 întrebări
  const anyProgress = await prisma.lessonProgress.findFirst({ where: { userId, lesson: { chapter: { subjectId: subject.id } } } });
  const anyConcept = await prisma.userConceptProgress.findFirst({ where: { userId } });
  if (!anyProgress && !anyConcept) {
    return {
      type: "DIAGNOSTIC",
      title: "Hai să vedem de unde pornim",
      description: "5–10 exerciții rapide ca să personalizăm traseul.",
      href: `/materii/${subject.slug}/diagnostic`,
      meta: "Diagnostic",
      priority: 0,
    };
  }

  // parcurge capitolele în ordine, găsește prima unitate nefinalizată
  for (const ch of subject.chapters) {
    const path = await getLearningPathForChapter(userId, ch.id);
    for (const unit of path) {
      if (unit.status === "IN_PROGRESS") {
        const lesson = unit.lessons[0];
        if (lesson) {
          return {
            type: "CONTINUE_LESSON",
            title: `Continuă: ${unit.title}`,
            description: `${ch.title} · ${Math.round(unit.progress)}%`,
            href: `/materii/${subject.slug}/${ch.slug}/${lesson.slug}`,
            meta: "Continuă lecția",
            priority: 1,
          };
        }
      }
      if (unit.status === "NEEDS_REVIEW") {
        return {
          type: "REVIEW_WEAK",
          title: `Consolidează: ${unit.title}`,
          description: `Mastery ${unit.masteryAvg ?? 0}% — mai avem de lucrat.`,
          href: `/materii/${subject.slug}/${ch.slug}/${unit.lessons[0]?.slug ?? ""}`,
          meta: "Review",
          priority: 2,
        };
      }
    }
  }

  // 3. review programat (spaced repetition due)
  const due = await getDueReviews(userId, 5);
  if (due.length > 0) {
    return {
      type: "REVIEW_SCHEDULED",
      title: "Recapitulare programată",
      description: `${due.length} concepte de revizuit azi.`,
      href: "/recapitulare",
      meta: "Recapitulare",
      priority: 3,
    };
  }

  // 4. următoarea lecție disponibilă
  for (const ch of subject.chapters) {
    const path = await getLearningPathForChapter(userId, ch.id);
    const next = path.find((u) => u.status === "AVAILABLE");
    if (next && next.lessons[0]) {
      // dacă e checkpoint/recap, tratează ca checkpoint
      if (next.type === "CHECKPOINT") {
        return {
          type: "CHECKPOINT",
          title: next.title,
          description: ch.title,
          href: `/checkpoint/${next.slug}`.replace("//", "/"),
          meta: "Checkpoint",
          priority: 5,
        };
      }
      return {
        type: "NEXT_LESSON",
        title: next.title,
        description: ch.title,
        href: `/materii/${subject.slug}/${ch.slug}/${next.lessons[0].slug}`,
        meta: "Următoarea lecție",
        priority: 4,
      };
    }
  }

  // 5. checkpoint disponibil
  for (const ch of subject.chapters) {
    const path = await getLearningPathForChapter(userId, ch.id);
    const cp = path.find((u) => u.type === "CHECKPOINT" && u.status === "AVAILABLE");
    if (cp) {
      return {
        type: "CHECKPOINT",
        title: cp.title,
        description: ch.title,
        href: `/materii/${subject.slug}/${ch.slug}#checkpoint`,
        meta: "Checkpoint",
        priority: 5,
      };
    }
  }

  // 6. practică suplimentară
  return {
    type: "PRACTICE",
    title: "Exersează concepte stăpânite",
    description: "Alege un capitol să-ți menții forma.",
    href: `/materii/${subject.slug}`,
    meta: "Practică",
    priority: 6,
  };
}

export async function getGlobalNextAction(userId: string): Promise<NextAction | null> {
  const subjects = await prisma.subject.findMany({ orderBy: { order: "asc" } });
  // găsește prima materie cu progres sau prima
  let best: NextAction | null = null;
  for (const s of subjects) {
    const action = await getNextBestActionForSubject(userId, s.slug);
    if (action && action.type !== "PRACTICE") {
      if (!best || action.priority < best.priority) best = action;
    }
  }
  if (best) return best;
  // fallback: prima materie
  if (subjects[0]) {
    return getNextBestActionForSubject(userId, subjects[0].slug);
  }
  return null;
}
