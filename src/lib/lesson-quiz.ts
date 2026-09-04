import { prisma } from "@/lib/db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

// Găsește sau creează quiz-ul „de lecție" (exercițiile lecției) atașat prin
// pasul de tip EXERSEAZĂ. O lecție are un singur quiz de exerciții în uz.
export async function getOrCreateLessonQuiz(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { chapter: { include: { subject: true } } },
  });
  if (!lesson) throw new Error("Lecția nu există.");

  // 1. un pas EXERSEAZĂ existent care are deja un quiz atașat
  const existingStep = await prisma.lessonStep.findFirst({
    where: { lessonId, stepType: "EXERSEAZĂ", quizId: { not: null } },
  });
  if (existingStep?.quizId) {
    return await quizWithQuestions(existingStep.quizId);
  }

  // 2. orice pas al lecției cu un quiz atașat (ex. exercițiu lipit de o secțiune
  //    din Constructor) → acela este quiz-ul lecției; nu creăm un duplicat
  const anyStepWithQuiz = await prisma.lessonStep.findFirst({
    where: { lessonId, quizId: { not: null } },
  });
  if (anyStepWithQuiz?.quizId) {
    return await quizWithQuestions(anyStepWithQuiz.quizId);
  }

  const baseTitle = `Exerciții — ${lesson.title}`;
  const slug = `${slugify(baseTitle)}-${lesson.id.slice(0, 6)}`;

  // 3. upsert pe (subjectId, slug) → nu aruncă P2002 dacă quiz-ul a mai fost creat
  //    (ex. pasul EXERSEAZĂ a fost șters din Constructor, iar quiz-ul a rămas orfan)
  const quiz = await prisma.quiz.upsert({
    where: { subjectId_slug: { subjectId: lesson.chapter.subjectId, slug } },
    update: {},
    create: {
      subjectId: lesson.chapter.subjectId,
      chapterId: lesson.chapterId,
      title: baseTitle,
      slug,
      difficulty: lesson.difficulty,
      published: true,
      order: lesson.order,
    },
  });

  // 4. atașăm quiz-ul la pasul EXERSEAZĂ (creat la final dacă nu există)
  let step = await prisma.lessonStep.findFirst({
    where: { lessonId, stepType: "EXERSEAZĂ" },
  });
  if (!step) {
    const lastStep = await prisma.lessonStep.findFirst({
      where: { lessonId },
      orderBy: { order: "desc" },
    });
    step = await prisma.lessonStep.create({
      data: {
        lessonId,
        title: "Exersează",
        content: "Rezolvă exercițiile de mai jos pentru a fixa noțiunile.",
        order: (lastStep?.order ?? -1) + 1,
        stepType: "EXERSEAZĂ",
      },
    });
  }
  if (step.quizId !== quiz.id) {
    await prisma.lessonStep.update({
      where: { id: step.id },
      data: { quizId: quiz.id },
    });
  }

  return await quizWithQuestions(quiz.id);
}

async function quizWithQuestions(quizId: string) {
  return prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } }, step: true },
  });
}
