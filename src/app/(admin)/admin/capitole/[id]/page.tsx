import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { ChapterForm } from "@/components/admin/chapter-form";
import { LessonForm } from "@/components/admin/lesson-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PendingLink } from "@/components/admin/pending-link";
import { deleteLesson } from "@/lib/actions/admin";

export default async function AdminChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      subject: true,
      lessons: { orderBy: { order: "asc" }, include: { _count: { select: { progress: true } } } },
    },
  });

  if (!chapter) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href={`/admin/materii/${chapter.subjectId}`}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {chapter.subject.name}
      </Link>

      <Card>
        <CardContent className="p-5">
          <h1 className="mb-4 text-2xl font-extrabold text-ink">{chapter.title}</h1>
          <ChapterForm
            subjectId={chapter.subjectId}
            chapterId={chapter.id}
            initial={{
              title: chapter.title,
              slug: chapter.slug,
              description: chapter.description ?? "",
              order: chapter.order,
            }}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold text-ink">Lecții ({chapter.lessons.length})</h2>

        <div className="space-y-3">
          {chapter.lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold text-ink">{lesson.title}</p>
                  <p className="text-xs text-subtle">
                    {lesson._count.progress} progrese · {lesson.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <DeleteButton action={deleteLesson} id={lesson.id} />
                  <PendingLink
                    href={`/admin/lectii/${lesson.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                  >
                    Editează <ChevronRight className="h-3.5 w-3.5" />
                  </PendingLink>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <p className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
              <Plus className="h-5 w-5" /> Adaugă o lecție nouă
            </p>
            <LessonForm
              chapterId={chapter.id}
              lessonId={null}
              mathSubject={chapter.subject.name.toLowerCase().includes("matem")}
              initial={{
                title: "",
                slug: "",
                content: "",
                videoUrl: "",
                pdfUrl: "",
                order: chapter.lessons.length + 1,
                difficulty: 1,
              }}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
