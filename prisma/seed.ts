import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/baculet";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function md(...parts: string[]): string {
  return readFileSync(join(process.cwd(), "prisma", "content", ...parts), "utf8");
}

type LessonSeed = {
  title: string;
  slug: string;
  order: number;
  file: string[];
};

type ChapterSeed = {
  title: string;
  slug: string;
  order: number;
  lessons: LessonSeed[];
};

async function main() {
  // ─── Matematică ────────────────────────────────────────────────
  const mate = await upsertSubject({
    name: "Matematică",
    slug: "matematica",
    description: "Algebră, analiză și geometrie pentru profilul real și tehnologic.",
    icon: "📐",
    color: "#58cc02",
    order: 1,
    profiles: ["REAL", "TECH"],
  });

  const mateChapters: ChapterSeed[] = [
    {
      title: "Algebră",
      slug: "algebra",
      order: 1,
      lessons: [
        {
          title: "Funcții de gradul I",
          slug: "functii-de-gradul-i",
          order: 1,
          file: ["matematica", "algebra", "functii-de-gradul-i.md"],
        },
        {
          title: "Ecuații de gradul al II-lea",
          slug: "ecuatii-de-gradul-al-ii-lea",
          order: 2,
          file: ["matematica", "algebra", "ecuatii-de-gradul-al-ii-lea.md"],
        },
      ],
    },
    {
      title: "Geometrie",
      slug: "geometrie",
      order: 2,
      lessons: [
        {
          title: "Triunghiul — teoreme esențiale",
          slug: "triunghiul-teoreme-esentiale",
          order: 1,
          file: ["matematica", "geometrie", "triunghiul-teoreme-esentiale.md"],
        },
      ],
    },
  ];

  for (const chapter of mateChapters) {
    const ch = await upsertChapter(mate.id, chapter);
    for (const lesson of chapter.lessons) {
      await upsertLesson(ch.id, { ...lesson, content: md(...lesson.file) });
    }
  }

  await upsertQuiz(mate.id, "algebra", {
    title: "Test grilă — Algebră",
    slug: "test-grila-algebra",
    difficulty: 1,
    order: 1,
    questions: [
      {
        text: "Care este rădăcina funcției f(x) = 2x - 6?",
        options: ["x = 2", "x = 3", "x = -3", "x = 6"],
        correctIndex: 1,
        explanation: "2x - 6 = 0 ⇒ 2x = 6 ⇒ x = 3.",
      },
      {
        text: "Pentru ce valoare a lui a funcția f(x) = ax + 3 are rădăcina x = 1?",
        options: ["a = -3", "a = 3", "a = 1", "a = 0"],
        correctIndex: 0,
        explanation: "a·1 + 3 = 0 ⇒ a = -3.",
      },
      {
        text: "Discriminantul ecuației x² + 4x + 4 = 0 este:",
        options: ["Δ = 0", "Δ = 16", "Δ = 4", "Δ = 8"],
        correctIndex: 0,
        explanation: "Δ = 16 - 16 = 0, deci ecuația are o rădăcină dublă.",
      },
      {
        text: "Suma rădăcinilor ecuației x² - 7x + 12 = 0 este:",
        options: ["7", "12", "-7", "-12"],
        correctIndex: 0,
        explanation: "Din relațiile lui Viète, S = -b/a = 7.",
      },
      {
        text: "Produsul rădăcinilor ecuației x² - 7x + 12 = 0 este:",
        options: ["7", "12", "-12", "6"],
        correctIndex: 1,
        explanation: "P = c/a = 12/1 = 12.",
      },
    ],
  });

  // ─── Limba și literatura română ───────────────────────────────
  const română = await upsertSubject({
    name: "Limba și literatura română",
    slug: "limba-romana",
    description: "Curente literare, autori și eseu argumentativ pentru Bac.",
    icon: "📖",
    color: "#1cb0f6",
    order: 2,
    profiles: ["REAL", "HUMAN", "TECH"],
  });

  const românăChapter: ChapterSeed = {
    title: "Literatura română în perioada interbelică",
    slug: "literatura-interbelica",
    order: 1,
    lessons: [
      {
        title: "Curente și teme la Bac",
        slug: "curente-si-teme-la-bac",
        order: 1,
        file: ["limba-romana", "literatura-interbelica", "curente-si-teme-la-bac.md"],
      },
    ],
  };

  const românăCap = await upsertChapter(română.id, românăChapter);
  for (const lesson of românăChapter.lessons) {
    await upsertLesson(românăCap.id, { ...lesson, content: md(...lesson.file) });
  }

  await upsertQuiz(română.id, null, {
    title: "Test grilă — Română",
    slug: "test-grila-romana",
    difficulty: 1,
    order: 1,
    questions: [
      {
        text: "Ce autor este reprezentativ pentru poezia simbolistă românească?",
        options: ["George Bacovia", "Lucian Blaga", "Ion Barbu", "Tudor Arghezi"],
        correctIndex: 0,
        explanation: "George Bacovia este considerat principalul reprezentant al simbolismului românesc.",
      },
      {
        text: "Care dintre următoarele este o operă de Camil Petrescu?",
        options: [
          "Plumb",
          "Ultima noapte de dragoste, întâia noapte de război",
          "Testament",
          "Maitreyi",
        ],
        correctIndex: 1,
        explanation: "Camil Petrescu a scris „Ultima noapte de dragoste, întâia noapte de război”.",
      },
      {
        text: "Volumul de debut al lui Lucian Blaga este:",
        options: ["Plumb", "Poemele luminii", "Flori de mucigai", "Joc secund"],
        correctIndex: 1,
        explanation: "Lucian Blaga debutează în 1919 cu „Poemele luminii”.",
      },
    ],
  });

  // ─── Istorie ──────────────────────────────────────────────────
  const istorie = await upsertSubject({
    name: "Istorie",
    slug: "istorie",
    description: "România modernă și contemporană, evoluții europene și mondiale.",
    icon: "🏛️",
    color: "#ffc800",
    order: 3,
    profiles: ["HUMAN", "TECH"],
  });

  const istorieChapter: ChapterSeed = {
    title: "România modernă",
    slug: "romania-moderna",
    order: 1,
    lessons: [
      {
        title: "Unirea Principatelor",
        slug: "unirea-principatelor",
        order: 1,
        file: ["istorie", "romania-moderna", "unirea-principatelor.md"],
      },
    ],
  };

  const istorieCap = await upsertChapter(istorie.id, istorieChapter);
  for (const lesson of istorieChapter.lessons) {
    await upsertLesson(istorieCap.id, { ...lesson, content: md(...lesson.file) });
  }

  // ─── Fizică ───────────────────────────────────────────────────
  const fizică = await upsertSubject({
    name: "Fizică",
    slug: "fizica",
    description: "Mecanică, electricitate, termodinamică și optică pentru profil real.",
    icon: "⚛️",
    color: "#ce82ff",
    order: 4,
    profiles: ["REAL", "TECH"],
  });

  const fizicăChapter: ChapterSeed = {
    title: "Mecanică",
    slug: "mecanica",
    order: 1,
    lessons: [
      {
        title: "Legile lui Newton",
        slug: "legile-lui-newton",
        order: 1,
        file: ["fizica", "mecanica", "legile-lui-newton.md"],
      },
    ],
  };

  const fizicăCap = await upsertChapter(fizică.id, fizicăChapter);
  for (const lesson of fizicăChapter.lessons) {
    await upsertLesson(fizicăCap.id, { ...lesson, content: md(...lesson.file) });
  }

  // ─── Geografie ────────────────────────────────────────────────
  const geografie = await upsertSubject({
    name: "Geografie",
    slug: "geografie",
    description: "Geografia României și a Europei pentru profilul uman.",
    icon: "🌍",
    color: "#ff9600",
    order: 5,
    profiles: ["HUMAN"],
  });

  const geografieChapter: ChapterSeed = {
    title: "România",
    slug: "romania",
    order: 1,
    lessons: [
      {
        title: "Relieful României",
        slug: "relieful-romaniei",
        order: 1,
        file: ["geografie", "romania", "relieful-romaniei.md"],
      },
    ],
  };

  const geografieCap = await upsertChapter(geografie.id, geografieChapter);
  for (const lesson of geografieChapter.lessons) {
    await upsertLesson(geografieCap.id, { ...lesson, content: md(...lesson.file) });
  }

  // ─── Subiecte oficiale ─────────────────────────────────────────
  await upsertExam(mate.id, {
    year: 2024,
    session: "SUMMER",
    profile: "REAL",
    title: "Subiectul I",
    pdfUrl: "https://www.edu.ro/sites/default/files/_fi%C8%99iere/Examen/BAC2024/Matematica_tehnologic.pdf",
    solutionUrl: "https://www.edu.ro/sites/default/files/_fi%C8%99iere/Examen/BAC2024/Matematica_tehnologic_barem.pdf",
  });
  await upsertExam(română.id, {
    year: 2024,
    session: "SUMMER",
    profile: "REAL",
    title: "Subiectul I",
    pdfUrl: "https://www.edu.ro/sites/default/files/_fi%C8%99iere/Examen/BAC2024/Limba_romana_varianta_1.pdf",
    solutionUrl: "https://www.edu.ro/sites/default/files/_fi%C8%99iere/Examen/BAC2024/Limba_romana_varianta_1_barem.pdf",
  });
await upsertExam(istorie.id, {
    year: 2023,
    session: "SUMMER",
    profile: "HUMAN",
    title: "Subiectul I",
    pdfUrl: "https://www.edu.ro/sites/default/files/_fi%C8%99iere/Examen/BAC2023/istorie_umane_varianta_1.pdf",
  });

  // ─── Teme ────────────────────────────────────────────────────
  const themes: ThemeSeed[] = [
    {
      name: "Slate",
      slug: "slate",
      description: "Neutru, inspirat de sticlă și oțel. Seamănă cu aspectul implicit.",
      order: 1,
      light: {
        background: "#f5f5f7",
        foreground: "#1d1d1f",
        card: "#ffffff",
        ink: "#1d1d1f",
        subtle: "#6e6e73",
        feather: "#d2d2d7",
        accent: "#0a7cff",
        accentDark: "#0060df",
      },
      dark: {
        background: "#1e1e1e",
        foreground: "#f5f5f7",
        card: "#2c2c2e",
        ink: "#f5f5f7",
        subtle: "#98989d",
        feather: "#3a3a3c",
        accent: "#0a7cff",
        accentDark: "#7bb3ff",
      },
    },
    {
      name: "Ocean",
      slug: "ocean",
      description: "Albastruri profunde și apă calmă.",
      order: 2,
      light: {
        background: "#eef6fb",
        foreground: "#0b1a2a",
        card: "#ffffff",
        ink: "#0f2937",
        subtle: "#5f7a92",
        feather: "#d7e6f1",
        accent: "#0284c7",
        accentDark: "#0369a1",
      },
      dark: {
        background: "#0a1420",
        foreground: "#e6f2f9",
        card: "#152230",
        ink: "#e6f2f9",
        subtle: "#7f97a9",
        feather: "#26394a",
        accent: "#38bdf8",
        accentDark: "#0ea5e9",
      },
    },
    {
      name: "Forest",
      slug: "forest",
      description: "Verzi reconfortante, ca o pădure în zori.",
      order: 3,
      light: {
        background: "#f2f7f1",
        foreground: "#122418",
        card: "#ffffff",
        ink: "#16301f",
        subtle: "#6f8a76",
        feather: "#dcedd9",
        accent: "#22a55b",
        accentDark: "#187a42",
      },
      dark: {
        background: "#0f1a12",
        foreground: "#e9f5ea",
        card: "#17241a",
        ink: "#e9f5ea",
        subtle: "#8fbb96",
        feather: "#2c3b30",
        accent: "#34d399",
        accentDark: "#10b981",
      },
    },
    {
      name: "Midnight",
      slug: "midnight",
      description: "Violet și indigo, pentru vreme de noapte.",
      order: 4,
      light: {
        background: "#f6f3fb",
        foreground: "#1b1331",
        card: "#ffffff",
        ink: "#241a4f",
        subtle: "#8479a6",
        feather: "#e5e0f2",
        accent: "#7c3aed",
        accentDark: "#6d28d9",
      },
      dark: {
        background: "#120d26",
        foreground: "#ece6ff",
        card: "#1b1532",
        ink: "#ece6ff",
        subtle: "#9d90c4",
        feather: "#322a4f",
        accent: "#a78bfa",
        accentDark: "#8b5cf6",
      },
    },
    {
      name: "Sunset",
      slug: "sunset",
      description: "Portocalii și roz calde, ca la asfințit.",
      order: 5,
      light: {
        background: "#fef6f0",
        foreground: "#3a1d0e",
        card: "#ffffff",
        ink: "#3a2a1c",
        subtle: "#b08b74",
        feather: "#f5e2d2",
        accent: "#f97316",
        accentDark: "#c2410c",
      },
      dark: {
        background: "#241310",
        foreground: "#ffefe3",
        card: "#31190f",
        ink: "#ffe9db",
        subtle: "#c69a80",
        feather: "#3e241c",
        accent: "#fb923c",
        accentDark: "#f97316",
      },
    },
    {
      name: "Mint",
      slug: "mint",
      description: "Mentă proaspătă și verde ocean.",
      order: 6,
      light: {
        background: "#eef8f4",
        foreground: "#07302a",
        card: "#ffffff",
        ink: "#0f3d33",
        subtle: "#6cae9c",
        feather: "#dbf2eb",
        accent: "#10b981",
        accentDark: "#059669",
      },
      dark: {
        background: "#0b1f1a",
        foreground: "#e6fbf4",
        card: "#13291f",
        ink: "#e6fbf4",
        subtle: "#8bbcb0",
        feather: "#24463c",
        accent: "#2dd4bf",
        accentDark: "#14b8a6",
      },
    },
  ];

  for (const theme of themes) {
    await upsertTheme(theme);
  }

  console.log("Seed complet ✓");
  console.log("  Materii: Matematică, Română, Istorie, Fizică, Geografie");
  console.log("  Subiecte oficiale: 3");
}

async function upsertSubject(data: {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  profiles: string[];
}) {
  const subject = await prisma.subject.upsert({
    where: { slug: data.slug },
    update: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      order: data.order,
    },
    create: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      color: data.color,
      order: data.order,
    },
  });

  await prisma.subjectProfile.deleteMany({ where: { subjectId: subject.id } });
  await prisma.subjectProfile.createMany({
    data: data.profiles.map((profile) => ({
      subjectId: subject.id,
      profile: profile as "REAL" | "HUMAN" | "TECH",
    })),
  });

  return subject;
}

async function upsertChapter(subjectId: string, data: ChapterSeed) {
  const chapter = await prisma.chapter.upsert({
    where: { subjectId_slug: { subjectId, slug: data.slug } },
    update: { title: data.title, order: data.order },
    create: { subjectId, title: data.title, slug: data.slug, order: data.order },
  });
  return chapter;
}

async function upsertLesson(
  chapterId: string,
  data: { title: string; slug: string; order: number; content: string }
) {
  await prisma.lesson.upsert({
    where: { chapterId_slug: { chapterId, slug: data.slug } },
    update: { title: data.title, content: data.content, order: data.order },
    create: {
      chapterId,
      title: data.title,
      slug: data.slug,
      order: data.order,
      content: data.content,
    },
  });
}

async function upsertQuiz(
  subjectId: string,
  chapterSlug: string | null,
  data: {
    title: string;
    slug: string;
    difficulty: number;
    order: number;
    questions: {
      text: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
    }[];
  }
) {
  const chapter = chapterSlug
    ? await prisma.chapter.findUnique({
        where: { subjectId_slug: { subjectId, slug: chapterSlug } },
      })
    : null;

  const quiz = await prisma.quiz.upsert({
    where: { subjectId_slug: { subjectId, slug: data.slug } },
    update: {
      title: data.title,
      difficulty: data.difficulty,
      order: data.order,
      chapterId: chapter?.id ?? null,
    },
    create: {
      subjectId,
      chapterId: chapter?.id ?? null,
      title: data.title,
      slug: data.slug,
      difficulty: data.difficulty,
      order: data.order,
    },
  });

  const existing = await prisma.question.findMany({ where: { quizId: quiz.id } });
  for (const q of existing) {
    await prisma.question.delete({ where: { id: q.id } });
  }
  await prisma.question.createMany({
    data: data.questions.map((q, i) => ({
      quizId: quiz.id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? null,
      order: i,
    })),
  });

  return quiz;
}

async function upsertExam(
  subjectId: string,
  data: {
    year: number;
    session: "SUMMER" | "AUTUMN" | "SPECIAL";
    profile: "REAL" | "HUMAN" | "TECH";
    title: string;
    pdfUrl: string;
    solutionUrl?: string;
  }
) {
  await prisma.officialExam.upsert({
    where: {
      subjectId_year_session_title: {
        subjectId,
        year: data.year,
        session: data.session,
        title: data.title,
      },
    },
    update: {
      profile: data.profile,
      pdfUrl: data.pdfUrl,
      solutionUrl: data.solutionUrl ?? null,
    },
    create: {
      subjectId,
      year: data.year,
      session: data.session,
      profile: data.profile,
      title: data.title,
      pdfUrl: data.pdfUrl,
      solutionUrl: data.solutionUrl ?? null,
    },
  });
}

// ─── Teme ────────────────────────────────────────────────────
type ThemePalette = {
  background: string;
  foreground: string;
  card: string;
  ink: string;
  subtle: string;
  feather: string;
  accent: string;
  accentDark: string;
};

type ThemeSeed = {
  name: string;
  slug: string;
  description: string;
  order: number;
  light: ThemePalette;
  dark: ThemePalette;
};

async function upsertTheme(data: ThemeSeed) {
  await prisma.theme.upsert({
    where: { slug: data.slug },
    update: {
      name: data.name,
      description: data.description,
      order: data.order,
      light: data.light,
      dark: data.dark,
    },
    create: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      enabled: true,
      order: data.order,
      light: data.light,
      dark: data.dark,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
