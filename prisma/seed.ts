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
      title: "Algebră — clasa a IX-a",
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
        {
          title: "Funcția de gradul al II-lea",
          slug: "functia-de-gradul-al-ii-lea",
          order: 3,
          file: ["matematica", "algebra", "functia-de-gradul-al-ii-lea.md"],
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
    {
      title: "Trigonometrie",
      slug: "trigonometrie",
      order: 3,
      lessons: [
        {
          title: "Elemente de trigonometrie",
          slug: "elemente-de-trigonometrie",
          order: 1,
          file: ["matematica", "trigonometrie", "elemente-de-trigonometrie.md"],
        },
      ],
    },
    {
      title: "Combinatorică și Geometrie analitică",
      slug: "combinatorica-geometrie-analitica",
      order: 4,
      lessons: [
        {
          title: "Permutări, aranjamente, combinări",
          slug: "permutari-aranjamente-combinari",
          order: 1,
          file: ["matematica", "combinatorica", "permutari-aranjamente-combinari.md"],
        },
        {
          title: "Reper cartezian și ecuația dreptei",
          slug: "reper-si-ecuatia-dreptei",
          order: 2,
          file: ["matematica", "geometrie-analitica", "reper-si-ecuatia-dreptei.md"],
        },
      ],
    },
    {
      title: "Matrice, determinanți și sisteme",
      slug: "matrice-determinanti-sisteme",
      order: 5,
      lessons: [
        {
          title: "Matrice și determinanți",
          slug: "matrice-determinanti",
          order: 1,
          file: ["matematica", "matrice", "matrice-determinanti.md"],
        },
        {
          title: "Sisteme de ecuații liniare",
          slug: "sisteme-de-ecuatii",
          order: 2,
          file: ["matematica", "matrice", "sisteme-de-ecuatii.md"],
        },
      ],
    },
    {
      title: "Analiză — limite, continuitate și derivate",
      slug: "analiza-limite-derivate",
      order: 6,
      lessons: [
        {
          title: "Limite și continuitate",
          slug: "limite-continuitate",
          order: 1,
          file: ["matematica", "analiza-xi", "limite-continuitate.md"],
        },
        {
          title: "Derivate și studiul funcțiilor",
          slug: "derivate-si-studiu",
          order: 2,
          file: ["matematica", "analiza-xi", "derivate-si-studiu.md"],
        },
      ],
    },
    {
      title: "Algebră XII și Analiză XII",
      slug: "algebra-analiza-xii",
      order: 7,
      lessons: [
        {
          title: "Grupuri, inele și polinoame",
          slug: "grupuri-inele-polinoame",
          order: 1,
          file: ["matematica", "algebra-xii", "grupuri-inele-polinoame.md"],
        },
        {
          title: "Primitive și integrala definită",
          slug: "primitive-integrala",
          order: 2,
          file: ["matematica", "analiza-xii", "primitive-integrala.md"],
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

  // ─── Units & Concepts (Learning Path - data-driven) ───────────────
  for (const chapter of mateChapters) {
    const ch = await prisma.chapter.findUnique({ where: { subjectId_slug: { subjectId: mate.id, slug: chapter.slug } } });
    if (!ch) continue;
    const lessons = await prisma.lesson.findMany({ where: { chapterId: ch.id }, orderBy: { order: "asc" } });
    for (const l of lessons) {
      const unit = await upsertUnit(ch.id, {
        title: l.title,
        slug: l.slug,
        order: l.order,
        type: "LESSON",
        description: `Unitate: ${l.title}`,
      });
      await prisma.lesson.update({ where: { id: l.id }, data: { unitId: unit.id } });
      // 2-3 concepte per lecție (demo, marchează clar)
      const base = l.slug;
      await upsertConcept(l.id, { name: "Noțiuni de bază", slug: `${base}-notiuni`, order: 1, difficulty: 1 });
      await upsertConcept(l.id, { name: "Aplicare", slug: `${base}-aplicare`, order: 2, difficulty: 2 });
      if (l.title.toLowerCase().includes("grad") || l.title.toLowerCase().includes("trigonometrie")) {
        await upsertConcept(l.id, { name: "Exercițiu tip BAC", slug: `${base}-bac`, order: 3, difficulty: 3 });
      }
    }
    // Unitate de recapitulare automată
    await upsertUnit(ch.id, {
      title: "Recapitulare",
      slug: `recap-${chapter.slug}`,
      order: 99,
      type: "RECAP",
      description: "Recapitulare automată — 2 întrebări din fiecare lecție anterioară",
    });
    // Checkpoint
    const cpUnit = await upsertUnit(ch.id, {
      title: "Checkpoint",
      slug: `checkpoint-${chapter.slug}`,
      order: 100,
      type: "CHECKPOINT",
      description: "Checkpoint — combină conceptele învățate",
    });
    await prisma.checkpoint.upsert({
      where: { slug: `checkpoint-${chapter.slug}` },
      update: { title: `Checkpoint — ${chapter.title}`, order: 100, chapterId: ch.id, unitId: cpUnit.id },
      create: { title: `Checkpoint — ${chapter.title}`, slug: `checkpoint-${chapter.slug}`, order: 100, chapterId: ch.id, unitId: cpUnit.id },
    });
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
        concept: "functii-grad1-radacina",
      },
      {
        text: "Pentru ce valoare a lui a funcția f(x) = ax + 3 are rădăcina x = 1?",
        options: ["a = -3", "a = 3", "a = 1", "a = 0"],
        correctIndex: 0,
        explanation: "a·1 + 3 = 0 ⇒ a = -3.",
        concept: "functii-grad1-parametru",
      },
      {
        text: "Discriminantul ecuației x² + 4x + 4 = 0 este:",
        options: ["Δ = 0", "Δ = 16", "Δ = 4", "Δ = 8"],
        correctIndex: 0,
        explanation: "Δ = 16 - 16 = 0, deci ecuația are o rădăcină dublă.",
        concept: "ecuatii-grad2-discriminant",
      },
      {
        text: "Suma rădăcinilor ecuației x² - 7x + 12 = 0 este:",
        options: ["7", "12", "-7", "-12"],
        correctIndex: 0,
        explanation: "Din relațiile lui Viète, S = -b/a = 7.",
        concept: "ecuatii-grad2-viete-suma",
      },
      {
        text: "Produsul rădăcinilor ecuației x² - 7x + 12 = 0 este:",
        options: ["7", "12", "-12", "6"],
        correctIndex: 1,
        explanation: "P = c/a = 12/1 = 12.",
        concept: "ecuatii-grad2-viete-produs",
      },
    ],
  });

  // Quiz inline de tip CLOZE / FLASHCARD pentru interactivitate
  await upsertQuiz(mate.id, "algebra", {
    title: "Mini-quiz — Funcții de gradul I (interactiv)",
    slug: "mini-quiz-functii-grad1",
    difficulty: 1,
    order: 2,
    questions: [
      {
        text: "Completează: Graficul funcției f(x)=ax+b este o ____.",
        options: ["parabolă", "dreaptă", "hiperbolă", "cerc"],
        correctIndex: 1,
        explanation: "Graficul este o dreaptă.",
        type: "FLASHCARD",
        concept: "functii-grad1-grafic",
      },
      {
        text: "Rădăcina lui f(x)=2x-4 este x = __.",
        options: ["1", "2", "4", "0"],
        correctIndex: 1,
        explanation: "2x-4=0 ⇒ x=2.",
        type: "CLOZE",
        concept: "functii-grad1-radacina",
      },
    ],
  });

  await upsertQuiz(mate.id, "trigonometrie", {
    title: "Test — Trigonometrie",
    slug: "test-trigonometrie",
    difficulty: 2,
    order: 3,
    questions: [
      {
        text: "sin²α + cos²α = ?",
        options: ["0", "1", "2", "sin2α"],
        correctIndex: 1,
        explanation: "Identitatea fundamentală.",
        concept: "trigonometrie-identitate",
      },
      {
        text: "Teorema sinusurilor: a/sinA = ?",
        options: ["2R", "R", "2r", "r"],
        correctIndex: 0,
        explanation: "a/sinA = 2R (raza cercului circumscris).",
        concept: "teorema-sinusurilor",
      },
      {
        text: "Valoarea lui cos 60° este:",
        options: ["0", "1/2", "√3/2", "1"],
        correctIndex: 1,
        explanation: "cos 60° = 1/2.",
        concept: "valori-trigonometrice",
      },
    ],
  });

  await upsertQuiz(mate.id, "combinatorica-geometrie-analitica", {
    title: "Test — Combinatorică & Geometrie analitică",
    slug: "test-combinatorica-geometrie",
    difficulty: 2,
    order: 4,
    questions: [
      {
        text: "C₅² = ?",
        options: ["10", "20", "5", "15"],
        correctIndex: 0,
        explanation: "C₅² = 10.",
        concept: "combinari",
      },
      {
        text: "Panta dreptei prin A(0,0) și B(2,4) este:",
        options: ["1", "2", "1/2", "4"],
        correctIndex: 1,
        explanation: "m=(4-0)/(2-0)=2.",
        concept: "panta-dreptei",
      },
      {
        text: "Două drepte sunt perpendiculare dacă:",
        options: ["m₁=m₂", "m₁·m₂=-1", "m₁·m₂=1", "m₁=-m₂"],
        correctIndex: 1,
        explanation: "Perpendicularitate: m₁·m₂=-1.",
        concept: "perpendicularitate",
      },
    ],
  });

  await upsertQuiz(mate.id, "matrice-determinanti-sisteme", {
    title: "Test — Matrice, determinanți și sisteme",
    slug: "test-matrice-sisteme",
    difficulty: 2,
    order: 5,
    questions: [
      {
        text: "det [[1,2],[3,4]] = ?",
        options: ["-2", "2", "10", "-10"],
        correctIndex: 0,
        explanation: "1·4-2·3=-2.",
        concept: "determinant-2x2",
      },
      {
        text: "O matrice pătratică e inversabilă dacă:",
        options: ["det=0", "det≠0", "det=1", "det>0"],
        correctIndex: 1,
        explanation: "Inversabilă iff det≠0.",
        concept: "inversabilitate",
      },
      {
        text: "Sistem Cramer are soluție unică dacă:",
        options: ["detA=0", "detA≠0", "detA=1", "B=0"],
        correctIndex: 1,
        explanation: "Cramer: detA≠0 → unică.",
        concept: "cramer",
      },
    ],
  });

  await upsertQuiz(mate.id, "analiza-limite-derivate", {
    title: "Test — Limite, continuitate și derivate",
    slug: "test-limite-derivate",
    difficulty: 2,
    order: 6,
    questions: [
      {
        text: "(x³)' = ?",
        options: ["3x²", "x²", "3x", "x³"],
        correctIndex: 0,
        explanation: "(xⁿ)'=n xⁿ⁻¹.",
        concept: "derivata-putere",
      },
      {
        text: "Ecuația tangentei în x₀ este:",
        options: ["y-f(x₀)=f'(x₀)(x-x₀)", "y = f'(x)", "y = mx+n", "y = f(x₀)+x"],
        correctIndex: 0,
        explanation: "Formula tangentei.",
        concept: "tangenta",
      },
      {
        text: "Dacă f'(x)>0 pe interval, f este:",
        options: ["descrescătoare", "crescătoare", "constantă", "concavă"],
        correctIndex: 1,
        explanation: "f'>0 → crescătoare.",
        concept: "monotonie",
      },
    ],
  });

  await upsertQuiz(mate.id, "algebra-analiza-xii", {
    title: "Test — Algebră XII & Analiză XII",
    slug: "test-algebra-analiza-xii",
    difficulty: 3,
    order: 7,
    questions: [
      {
        text: "Relația lui Viète S = -b/a se aplică pentru:",
        options: ["ec. grad 1", "ec. grad 2", "ec. grad 3", "sisteme"],
        correctIndex: 1,
        explanation: "Pentru ax²+bx+c, S = -b/a.",
        concept: "viete-grad2",
      },
      {
        text: "∫ x² dx = ?",
        options: ["x³/3 + C", "x³ + C", "2x + C", "x²/2 + C"],
        correctIndex: 0,
        explanation: "∫ xⁿ = xⁿ⁺¹/(n+1).",
        concept: "primitiva-putere",
      },
      {
        text: "Formula Leibniz-Newton: ∫ₐᵇ f(x)dx = ?",
        options: ["F(b)-F(a)", "F(a)-F(b)", "f(b)-f(a)", "0"],
        correctIndex: 0,
        explanation: "F(b)-F(a).",
        concept: "leibniz-newton",
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
        concept: "simbolism-bacovia",
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
        concept: "camil-petrescu-opera",
      },
      {
        text: "Volumul de debut al lui Lucian Blaga este:",
        options: ["Plumb", "Poemele luminii", "Flori de mucigai", "Joc secund"],
        correctIndex: 1,
        explanation: "Lucian Blaga debutează în 1919 cu „Poemele luminii”.",
        concept: "blaga-debut",
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
        subtle: "#56565a",
        feather: "#d2d2d7",
        accent: "#0a7cff",
        accentDark: "#0060df",
        onAccent: "#ffffff",
      },
      dark: {
        background: "#1e1e1e",
        foreground: "#f5f5f7",
        card: "#2c2c2e",
        ink: "#f5f5f7",
        subtle: "#acacb2",
        feather: "#3a3a3c",
        accent: "#0a7cff",
        accentDark: "#0060df",
        onAccent: "#ffffff",
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
        subtle: "#4f6579",
        feather: "#d7e6f1",
        accent: "#0284c7",
        accentDark: "#0369a1",
        onAccent: "#ffffff",
      },
      dark: {
        background: "#0a1420",
        foreground: "#e6f2f9",
        card: "#152230",
        ink: "#e6f2f9",
        subtle: "#90abbf",
        feather: "#26394a",
        accent: "#38bdf8",
        accentDark: "#0ea5e9",
        onAccent: "#0d0f14",
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
        subtle: "#576c5c",
        feather: "#dcedd9",
        accent: "#22a55b",
        accentDark: "#187a42",
        onAccent: "#ffffff",
      },
      dark: {
        background: "#0f1a12",
        foreground: "#e9f5ea",
        card: "#17241a",
        ink: "#e9f5ea",
        subtle: "#98c7a0",
        feather: "#2c3b30",
        accent: "#34d399",
        accentDark: "#10b981",
        onAccent: "#0d0f14",
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
        subtle: "#675e82",
        feather: "#e5e0f2",
        accent: "#7c3aed",
        accentDark: "#6d28d9",
        onAccent: "#ffffff",
      },
      dark: {
        background: "#120d26",
        foreground: "#ece6ff",
        card: "#1b1532",
        ink: "#ece6ff",
        subtle: "#a799d1",
        feather: "#322a4f",
        accent: "#a78bfa",
        accentDark: "#8b5cf6",
        onAccent: "#0d0f14",
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
        subtle: "#796050",
        feather: "#f5e2d2",
        accent: "#ea580c",
        accentDark: "#c2410c",
        onAccent: "#ffffff",
      },
      dark: {
        background: "#241310",
        foreground: "#ffefe3",
        card: "#31190f",
        ink: "#ffe9db",
        subtle: "#d3a488",
        feather: "#3e241c",
        accent: "#fb923c",
        accentDark: "#f97316",
        onAccent: "#0d0f14",
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
        subtle: "#467165",
        feather: "#dbf2eb",
        accent: "#0d9d6e",
        accentDark: "#059669",
        onAccent: "#ffffff",
      },
      dark: {
        background: "#0b1f1a",
        foreground: "#e6fbf4",
        card: "#13291f",
        ink: "#e6fbf4",
        subtle: "#94c8bb",
        feather: "#24463c",
        accent: "#2dd4bf",
        accentDark: "#14b8a6",
        onAccent: "#0d0f14",
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

async function upsertUnit(
  chapterId: string,
  data: { title: string; slug: string; order: number; type?: "LESSON" | "RECAP" | "CHECKPOINT" | "DIAGNOSTIC"; description?: string }
) {
  const unit = await prisma.unit.upsert({
    where: { chapterId_slug: { chapterId, slug: data.slug } },
    update: { title: data.title, order: data.order, type: (data.type ?? "LESSON") as never, description: data.description ?? null },
    create: {
      chapterId,
      title: data.title,
      slug: data.slug,
      order: data.order,
      type: (data.type ?? "LESSON") as never,
      description: data.description ?? null,
    },
  });
  return unit;
}

async function upsertConcept(
  lessonId: string,
  data: { name: string; slug: string; order: number; difficulty?: number; description?: string }
) {
  const concept = await prisma.concept.upsert({
    where: { lessonId_slug: { lessonId, slug: data.slug } },
    update: { name: data.name, order: data.order, difficulty: data.difficulty ?? 1, description: data.description ?? null },
    create: {
      lessonId,
      name: data.name,
      slug: data.slug,
      order: data.order,
      difficulty: data.difficulty ?? 1,
      description: data.description ?? null,
    },
  });
  return concept;
}

async function upsertLesson(
  chapterId: string,
  data: { title: string; slug: string; order: number; content: string }
) {
  const lesson = await prisma.lesson.upsert({
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
  await syncLessonSteps(lesson.id, data.content);
  return lesson;
}

const STEP_TYPES_SEED = ["DESCOPERĂ","ÎNȚELEGE","VEZI UN EXEMPLU","ÎNCEARCĂ","EXERSEAZĂ","APLICĂ","RECAPITULEAZĂ"] as const;
function inferStepTypeSeed(idx: number, title: string | null): string {
  if (title) {
    const t = title.toLowerCase();
    if (t.includes("descoper")) return "DESCOPERĂ";
    if (t.includes("înțeleg") || t.includes("inteleg")) return "ÎNȚELEGE";
    if (t.includes("exemplu")) return "VEZI UN EXEMPLU";
    if (t.includes("încearc") || t.includes("incearca")) return "ÎNCEARCĂ";
    if (t.includes("exersez") || t.includes("exers")) return "EXERSEAZĂ";
    if (t.includes("aplic")) return "APLICĂ";
    if (t.includes("recapitul")) return "RECAPITULEAZĂ";
  }
  return STEP_TYPES_SEED[idx % STEP_TYPES_SEED.length] ?? "DESCOPERĂ";
}
function parseLessonSteps(content: string): { title: string | null; content: string; stepType: string }[] {
  const sections: { title: string | null; content: string; stepType: string }[] = [];
  const lines = content.split("\n");
  let currentTitle: string | null = null;
  let buffer: string[] = [];
  let idx = 0;
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) {
      if (buffer.join("\n").trim() || currentTitle) {
        const title = currentTitle;
        sections.push({ title, content: buffer.join("\n").trim(), stepType: inferStepTypeSeed(idx, title) });
        idx++;
      }
      currentTitle = h2[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (buffer.join("\n").trim() || currentTitle) {
    const title = currentTitle;
    sections.push({ title, content: buffer.join("\n").trim(), stepType: inferStepTypeSeed(idx, title) });
  }
  if (sections.length === 0 && content.trim()) sections.push({ title: null, content: content.trim(), stepType: "DESCOPERĂ" });
  return sections.filter((s) => s.content.length > 0);
}

async function syncLessonSteps(lessonId: string, content: string) {
  const steps = parseLessonSteps(content);
  await prisma.lessonStep.deleteMany({ where: { lessonId, order: { gte: steps.length } } });
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const existing = await prisma.lessonStep.findUnique({ where: { lessonId_order: { lessonId, order: i } } });
    if (existing) {
      await prisma.lessonStep.update({ where: { id: existing.id }, data: { title: s.title, content: s.content, stepType: s.stepType } });
    } else {
      await prisma.lessonStep.create({ data: { lessonId, title: s.title, content: s.content, order: i, stepType: s.stepType } });
    }
  }
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
      type?: "SINGLE" | "CLOZE" | "FLASHCARD" | "DRAG_DROP";
      concept?: string;
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: ((q as any).type ?? "SINGLE") as any,
      concept: (q as { concept?: string }).concept ?? null,
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
  onAccent?: string;
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
