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
    return await prisma.quiz.findUnique({
      where: { id: existingStep.quizId },
      include: { questions: { orderBy: { order: "asc" } }, step: true },
    });
  }

  // 2. altfel: un pas EXERSEAZĂ existent fără quiz → îi atașăm unul nou
  const anyPracticeStep = await prisma.lessonStep.findFirst({
    where: { lessonId, stepType: "EXERSEAZĂ" },
  });

  const baseTitle = `Exerciții — ${lesson.title}`;
  const slug = `${slugify(baseTitle)}-${lesson.id.slice(0, 6)}`;

  const quiz = await prisma.quiz.create({
    data: {
      subjectId: lesson.chapter.subjectId,
      chapterId: lesson.chapterId,
      title: baseTitle,
      slug,
      difficulty: lesson.difficulty,
      published: true,
      order: lesson.order,
    },
  });

  // 3. atașăm quiz-ul la pasul EXERSEAZĂ (creat la final dacă nu există)
  let step = anyPracticeStep;
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
  await prisma.lessonStep.update({
    where: { id: step.id },
    data: { quizId: quiz.id },
  });

  return await prisma.quiz.findUnique({
    where: { id: quiz.id },
    include: { questions: { orderBy: { order: "asc" } }, step: true },
  });
}
