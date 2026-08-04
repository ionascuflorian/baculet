import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SubjectForm } from "@/components/admin/subject-form";
import { ChapterForm } from "@/components/admin/chapter-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteChapter } from "@/lib/actions/admin";

export default async function AdminSubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      subjectProfiles: true,
      chapters: { orderBy: { order: "asc" }, include: { _count: { select: { lessons: true } } } },    },
  });

  if (!subject) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/admin/materii"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Înapoi la materii
      </Link>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: `${subject.color}22` }}
            >
              {subject.icon}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-ink">{subject.name}</h1>
              <p className="text-sm text-subtle">Editează detaliile materiei</p>
            </div>
          </div>
          <SubjectForm
            subjectId={subject.id}
            initial={{
              name: subject.name,
              slug: subject.slug,
              description: subject.description ?? "",
              icon: subject.icon ?? "📘",
              color: subject.color ?? "#58cc02",
              order: subject.order,
              profiles: subject.subjectProfiles.map((p) => p.profile),
            }}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">
            Capitole ({subject.chapters.length})
          </h2>
        </div>

        <div className="space-y-3">
          {subject.chapters.map((chapter) => (
            <Card key={chapter.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold text-ink">{chapter.title}</p>
                  <p className="text-xs text-subtle">
                    {chapter._count.lessons} lecții · {chapter.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <DeleteButton action={deleteChapter} id={chapter.id} />
                  <Link
                    href={`/admin/capitole/${chapter.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                  >
                    Editează <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <p className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
              <Plus className="h-5 w-5" /> Adaugă un capitol nou
            </p>
            <ChapterForm
              subjectId={subject.id}
              chapterId={null}
              initial={{ title: "", slug: "", description: "", order: subject.chapters.length + 1 }}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
