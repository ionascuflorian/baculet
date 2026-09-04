import { prisma } from "@/lib/db";

export interface SearchResult {
  title: string;
  href: string;
  type: string;
  snippet: string;
}

export interface PageContext {
  title: string;
  kind: string;
  subjectTitle?: string;
  content: string;
}

function cleanMarkdown(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>~[\]()!|-]/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchSiteContent(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: SearchResult[] = [];

  const subjects = await prisma.subject.findMany({
    orderBy: { order: "asc" },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });

  for (const s of subjects) {
    if (s.name.toLowerCase().includes(q)) {
      out.push({
        title: s.name,
        href: `/materii/${s.slug}`,
        type: "Materie",
        snippet: s.description || "Materie de bacalaureat",
      });
    }
    for (const ch of s.chapters) {
      if (ch.title.toLowerCase().includes(q)) {
        out.push({
          title: ch.title,
          href: `/materii/${s.slug}/${ch.slug}`,
          type: `Modul · ${s.name}`,
          snippet: `${ch.lessons.length} lecții`,
        });
      }
      for (const l of ch.lessons) {
        const content = cleanMarkdown(l.content);
        const idx = content.toLowerCase().indexOf(q);
        if (l.title.toLowerCase().includes(q) || idx !== -1) {
          const start = Math.max(0, (idx === -1 ? 0 : idx) - 60);
          out.push({
            title: l.title,
            href: `/materii/${s.slug}/${ch.slug}/${l.slug}`,
            type: `Lecție · ${s.name}`,
            snippet:
              idx === -1
                ? content.slice(0, 110)
                : `…${content.slice(start, start + 130)}…`,
          });
        }
      }
    }
  }

  const quizzes = await prisma.quiz.findMany({
    where: { published: true, userId: null },
    include: { subject: true, _count: { select: { questions: true } } },
    orderBy: { order: "asc" },
  });
  for (const z of quizzes) {
    if (z.title.toLowerCase().includes(q)) {
      out.push({
        title: z.title,
        href: `/teste/${z.slug}`,
        type: `Test · ${z.subject.name}`,
        snippet: z.description || `${z._count.questions} întrebări`,
      });
    }
  }

  return out.slice(0, 12);
}

export async function getPageContext(pathname: string): Promise<PageContext | null> {
  if (!pathname) return null;

  const lessonMatch = pathname.match(/^\/materii\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (lessonMatch) {
    const [, sub, chap, les] = lessonMatch;
    const lesson = await prisma.lesson.findFirst({
      where: { slug: les, chapter: { slug: chap, subject: { slug: sub } } },
      include: { chapter: { include: { subject: true } } },
    });
    if (lesson) {
      return {
        title: lesson.title,
        kind: "lecție",
        subjectTitle: lesson.chapter.subject.name,
        content: lesson.content,
      };
    }
  }

  const chapterMatch = pathname.match(/^\/materii\/([^/]+)\/([^/]+)$/);
  if (chapterMatch) {
    const chapter = await prisma.chapter.findFirst({
      where: { slug: chapterMatch[2], subject: { slug: chapterMatch[1] } },
      include: {
        subject: true,
        lessons: { orderBy: { order: "asc" }, select: { title: true, slug: true } },
      },
    });
    if (chapter) {
      const content = [
        `Modulul „${chapter.title}" din materia ${chapter.subject.name}.`,
        "Lecții:",
        ...chapter.lessons.map((l) => `- ${l.title}`),
      ].join("\n");
      return { title: chapter.title, kind: "capitol", subjectTitle: chapter.subject.name, content };
    }
  }

  const subjectMatch = pathname.match(/^\/materii\/([^/]+)$/);
  if (subjectMatch) {
    const subject = await prisma.subject.findUnique({
      where: { slug: subjectMatch[1] },
      include: {
        chapters: { orderBy: { order: "asc" }, include: { _count: { select: { lessons: true } } } },
      },
    });
    if (subject) {
      const content = subject.chapters
        .map((c) => `${c.title} (${c._count.lessons} lecții)`)
        .join("\n");
      return { title: subject.name, kind: "materie", content };
    }
  }

  const quizMatch = pathname.match(/^\/teste\/([^/]+)/);
  if (quizMatch) {
    const quiz = await prisma.quiz.findFirst({
      where: { slug: quizMatch[1], published: true, userId: null },
      include: {
        subject: true,
        questions: { select: { text: true } },
      },
    });
    if (quiz) {
      const content = [
        `Test: „${quiz.title}" (materia ${quiz.subject.name}).`,
        quiz.description || "",
        `Întrebări (${quiz.questions.length}):`,
        ...quiz.questions.map((q, i) => `${i + 1}. ${q.text}`),
      ]
        .filter(Boolean)
        .join("\n");
      return { title: quiz.title, kind: "test", subjectTitle: quiz.subject.name, content };
    }
  }

  return null;
}
