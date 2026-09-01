import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckpointFlow } from "@/components/checkpoint/checkpoint-flow";

export default async function CheckpointPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const checkpoint = await prisma.checkpoint.findUnique({
    where: { slug },
    include: {
      chapter: { include: { subject: true } },
      unit: { include: { chapter: { include: { subject: true } } } },
    },
  });
  if (!checkpoint) notFound();

  const subjectSlug = checkpoint.chapter?.subject.slug ?? checkpoint.unit?.chapter.subject.slug ?? "";
  const chapterSlug = checkpoint.chapter?.slug ?? checkpoint.unit?.chapter.slug ?? "";
  const title = checkpoint.title;

  // Checkpoint distinct: 10 exerciții grupate pe concepte (nu lecții)
  const questions = await prisma.question.findMany({
    where: {
      quiz: { subject: { slug: subjectSlug }, chapter: { slug: chapterSlug } },
    },
    take: 10,
    orderBy: { order: "asc" },
    select: {
      id: true,
      text: true,
      options: true,
      correctIndex: true,
      explanation: true,
      conceptId: true,
      concept: true,
      conceptRef: { select: { name: true, slug: true } },
    },
  });
  const fallback =
    questions.length < 5
      ? await prisma.question.findMany({
          where: { quiz: { subject: { slug: subjectSlug } } },
          take: 10 - questions.length,
          orderBy: { order: "asc" },
          select: {
            id: true,
            text: true,
            options: true,
            correctIndex: true,
            explanation: true,
            conceptId: true,
            concept: true,
            conceptRef: { select: { name: true, slug: true } },
          },
        })
      : [];
  const allQs = [...questions, ...fallback]
    .slice(0, 10)
    .map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options as string[],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      conceptId: q.conceptId,
      conceptSlug: q.conceptRef?.slug ?? q.concept ?? null,
    }));

  return (
    <CheckpointFlow
      checkpointSlug={slug}
      title={title}
      questions={allQs}
      subjectSlug={subjectSlug}
      chapterSlug={chapterSlug}
    />
  );
}
