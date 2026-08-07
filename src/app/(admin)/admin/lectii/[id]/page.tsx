import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { LessonForm } from "@/components/admin/lesson-form";

export default async function AdminLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { chapter: { include: { subject: true } } },
  });

  if (!lesson) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/admin/capitole/${lesson.chapterId}`}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {lesson.chapter.subject.name} / {lesson.chapter.title}
      </Link>
      <Card>
        <CardContent className="p-5">
          <h1 className="mb-4 text-2xl font-extrabold text-ink">{lesson.title}</h1>
          <LessonForm
            chapterId={lesson.chapterId}
            lessonId={lesson.id}
            mathSubject={lesson.chapter.subject.name.toLowerCase().includes("matem")}
            initial={{
              title: lesson.title,
              slug: lesson.slug,
              content: lesson.content,
              videoUrl: lesson.videoUrl ?? "",
              pdfUrl: lesson.pdfUrl ?? "",
              order: lesson.order,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
