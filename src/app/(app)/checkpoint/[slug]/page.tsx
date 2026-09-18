import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CheckpointFlow } from "@/components/checkpoint/checkpoint-flow";
import { gatherCheckpointQuestions, toCheckpointQuestionDto } from "@/lib/checkpoint-source";

export default async function CheckpointPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

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

  // Întrebările vin din lecțiile unității pe care checkpoint-ul o încheie
  // (plus fallback pe capitol/materie) — aceleași ca în formularul de lecție.
  const rows = await gatherCheckpointQuestions(slug);
  const questions = rows.map(toCheckpointQuestionDto);

  return (
    <CheckpointFlow
      checkpointSlug={slug}
      title={title}
      questions={questions}
      subjectSlug={subjectSlug}
      chapterSlug={chapterSlug}
    />
  );
}