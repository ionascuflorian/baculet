import { prisma } from "@/lib/db";

export interface CheckpointResult {
  score: number;
  maxScore: number;
  pct: number;
  passed: boolean;
  weakConcepts: { conceptId: string; name: string; wrong: number }[];
  message: string;
}

export async function evaluateCheckpoint(
  checkpointId: string,
  answers: Record<string, number>
): Promise<CheckpointResult> {
  const cp = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    include: { unit: { include: { lessons: { include: { concepts: true } } } }, chapter: { include: { lessons: { include: { concepts: true } } } } },
  });
  if (!cp) throw new Error("Checkpoint inexistent");

  // găsim quiz-ul asociat checkpoint-ului (prin unit sau chapter)
  // deocamdată quiz-urile de tip checkpoint sunt legate de unitId via LessonStep or Quiz.chapterId
  // simplificat: luăm toate întrebările din quiz-uri ale capitolului/unității
  const quizs = await prisma.quiz.findMany({
    where: {
      OR: [
        { chapterId: cp.chapterId ?? undefined },
        { subject: { chapters: { some: { units: { some: { id: cp.unitId ?? undefined } } } } } },
      ],
    },
    include: { questions: { select: { id: true, correctIndex: true, conceptId: true, concept: true } } },
  });
  const allQuestions = quizs.flatMap((q) => q.questions);
  const score = allQuestions.filter((q) => answers[q.id] === q.correctIndex).length;
  const maxScore = allQuestions.length || 10;
  const pct = Math.round((score / maxScore) * 100);
  const passed = pct >= 60;

  // identifică concepte slabe
  const wrongs = allQuestions.filter((q) => answers[q.id] !== q.correctIndex);
  const byConcept = new Map<string, { name: string; wrong: number }>();
  for (const q of wrongs) {
    const key = q.conceptId ?? q.concept ?? "general";
    const cur = byConcept.get(key) ?? { name: key, wrong: 0 };
    cur.wrong += 1;
    byConcept.set(key, cur);
  }
  const weakConcepts = [...byConcept.values()].map((v) => ({ conceptId: v.name, name: v.name, wrong: v.wrong }));

  let message: string;
  if (pct >= 90) message = "9/10 — Foarte bine!";
  else if (pct >= 80) message = ` ${score}/${maxScore} — Ai înțeles cea mai mare parte. Mai consolidăm ${weakConcepts.map((w) => w.name).join(", ") || "puțin"}.`;
  else if (pct >= 60) message = ` ${score}/${maxScore} — Ai baza necesară, dar trebuie să consolidăm ${weakConcepts.map((w) => w.name).join(", ") || "concepte cheie"}.`;
  else message = ` ${score}/${maxScore} — Hai să refacem împreună conceptele de bază.`;

  return { score, maxScore, pct, passed, weakConcepts, message };
}

export async function createCheckpointReviewSession(userId: string, checkpointId: string, weakConcepts: string[]) {
  // creează o sesiune scurtă de review pentru conceptele slabe
  // returnează întrebări din baza de date pentru acele concepte
  if (weakConcepts.length === 0) return [];
  const concepts = await prisma.concept.findMany({ where: { slug: { in: weakConcepts } } });
  const conceptIds = concepts.map((c) => c.id);
  const questions = await prisma.question.findMany({
    where: { conceptId: { in: conceptIds } },
    take: 6,
    orderBy: { order: "asc" },
  });
  if (questions.length === 0) {
    return prisma.question.findMany({ where: { concept: { in: weakConcepts } }, take: 6 });
  }
  return questions;
}
