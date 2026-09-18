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

  // Learning path-ul fiecărui capitol e citit O SINGURĂ DATĂ, în paralel,
  // și refolosit în toate trecerile de mai jos (înainte era citit de până la
  // 3 ori per capitol, secvențial — N+1 masiv pe dashboard).
  const chapterPaths = await Promise.all(
    subject.chapters.map(async (ch) => ({
      ch,
      path: await getLearningPathForChapter(userId, ch.id),
    }))
  );

  // 2. parcurge capitolele în ordine, găsește prima unitate nefinalizată
  for (const { ch, path } of chapterPaths) {
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
  for (const { ch, path } of chapterPaths) {
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
  for (const { ch, path } of chapterPaths) {
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
    description: "Alege un modul să-ți menții forma.",
    href: `/materii/${subject.slug}`,
    meta: "Practică",
    priority: 6,
  };
}

export async function getGlobalNextAction(userId: string): Promise<NextAction | null> {
  const subjects = await prisma.subject.findMany({ orderBy: { order: "asc" } });
  // Materiile se evaluează în paralel (înainte erau evaluare secvențială).
  const actions = await Promise.all(
    subjects.map((s) => getNextBestActionForSubject(userId, s.slug))
  );
  // găsește cea mai bună acțiune non-PRACTICE (prioritate minimă), tie → prima materie
  let best: NextAction | null = null;
  for (const action of actions) {
    if (action && action.type !== "PRACTICE") {
      if (!best || action.priority < best.priority) best = action;
    }
  }
  if (best) return best;
  // fallback: prima materie (rezultatul a fost deja calculat în paralel)
  return actions[0] ?? null;
}

/**
 * Următoarea acțiune după un checkpoint, determinist și legat de unitate.
 * Când pct < pragul de trecere, conduce la lecția conceptului cel mai slab;
 * când trece, conduce la prima unitate/lecție nefinalizată din traseu.
 */
export async function getCheckpointNextAction(
  userId: string,
  checkpoint: { slug: string; unitId: string | null; chapterId: string | null },
  pct: number,
  weakConcepts: { conceptId: string; name: string }[]
): Promise<NextAction> {
  const chapter = checkpoint.chapterId
    ? await prisma.chapter.findUnique({
        where: { id: checkpoint.chapterId },
        select: {
          slug: true,
          subject: { select: { slug: true } },
        },
      })
    : null;
  const subjectSlug = chapter?.subject.slug ?? "";
  const chapterSlug = chapter?.slug ?? "";

  // Sub prag: review pe conceptul cel mai slab → lecția lui (dacă există).
  if (pct < 70 && weakConcepts.length > 0) {
    const weak = weakConcepts[0];
    if (weak.conceptId && weak.conceptId !== "general") {
      const concept = await prisma.concept.findUnique({
        where: { id: weak.conceptId },
        select: {
          name: true,
          lesson: {
            select: {
              slug: true,
              chapter: { select: { slug: true, subject: { select: { slug: true } } } },
            },
          },
        },
      });
      if (concept?.lesson?.slug) {
        return {
          type: "REVIEW_WEAK",
          title: `Revizuiește: ${concept.name}`,
          description: `Recitește lecția și reia exercițiile pentru ${weak.name}.`,
          href: `/materii/${concept.lesson.chapter.subject.slug}/${concept.lesson.chapter.slug}/${concept.lesson.slug}`,
          meta: "Review concept",
          priority: 1,
        };
      }
    }
    return {
      type: "REVIEW_WEAK",
      title: "Recapitulare personalizată",
      description: `${weakConcepts.length} concepte de consolidat — repetă-le pe cele greșite.`,
      href: "/recapitulare",
      meta: "Review",
      priority: 1,
    };
  }

  // Peste prag: prima unitate nefinalizată de după unitatea checkpoint-ului.
  if (chapter && checkpoint.unitId && checkpoint.chapterId) {
    const path = await getLearningPathForChapter(userId, checkpoint.chapterId);
    const idx = path.findIndex((u) => u.id === checkpoint.unitId);
    const next = path.slice(idx + 1).find((u) => u.status === "AVAILABLE" || u.status === "IN_PROGRESS");
    if (next) {
      if (next.type === "CHECKPOINT") {
        const cp = await prisma.checkpoint.findFirst({ where: { unitId: next.id }, select: { slug: true } });
        return {
          type: "CHECKPOINT",
          title: next.title,
          description: `Continuă traseul — ${chapterSlug}.`,
          href: cp?.slug ? `/checkpoint/${cp.slug}` : `/materii/${subjectSlug}/${chapterSlug}#checkpoint`,
          meta: "Checkpoint",
          priority: 4,
        };
      }
      if (next.lessons[0]) {
        return {
          type: "NEXT_LESSON",
          title: next.lessons[0].title,
          description: `Următoarea lecție — ${next.title}.`,
          href: `/materii/${subjectSlug}/${chapterSlug}/${next.lessons[0].slug}`,
          meta: "Următoarea lecție",
          priority: 4,
        };
      }
    }
  }

  return {
    type: "PRACTICE",
    title: "Continuă modulul",
    description: subjectSlug ? `Mergi la ${chapterSlug}.` : "Înapoi la materii.",
    href: subjectSlug ? `/materii/${subjectSlug}/${chapterSlug}` : "/materii",
    meta: "Modul",
    priority: 6,
  };
}
