import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CourseMap, type MapChapter } from "@/components/admin/course-map";

export default async function AdminSubjectMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: {
          units: {
            orderBy: { order: "asc" },
            include: {
              lessons: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  unitId: true,
                  steps: {
                    where: { quizId: { not: null } },
                    select: { quiz: { select: { _count: { select: { questions: true } } } } },
                  },
                },
              },
            },
          },
          lessons: {
            orderBy: { order: "asc" },
            where: { unitId: null },
            select: {
              id: true,
              title: true,
              slug: true,
              unitId: true,
              steps: {
                where: { quizId: { not: null } },
                select: { quiz: { select: { _count: { select: { questions: true } } } } },
              },
            },
          },
        },
      },
    },
  });

  if (!subject) notFound();

  const chapters: MapChapter[] = subject.chapters.map((chap) => ({
    id: chap.id,
    title: chap.title,
    slug: chap.slug,
    units: chap.units.map((u) => ({
      id: u.id,
      title: u.title,
      slug: u.slug,
      type: u.type,
      lessons: u.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        slug: l.slug,
        unitId: l.unitId,
        hasQuiz: l.steps.length > 0,
exerciseCount: l.steps.reduce((n, s) => n + (s.quiz?._count.questions ?? 0), 0),
      })),
    })),
    looseLessons: chap.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      unitId: l.unitId,
      hasQuiz: l.steps.length > 0,
      exerciseCount: l.steps.reduce((n, s) => n + (s.quiz?._count.questions ?? 0), 0),
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/admin/materii/${subject.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-subtle hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> {subject.name}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
          style={{ backgroundColor: `${subject.color}22` }}
        >
          <MapIcon className="h-6 w-6" style={{ color: subject.color ?? "#58cc02" }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Harta cursului</h1>
          <p className="text-sm text-subtle">
            {subject.name} — module, unități și lecții, cu numărul de exerciții.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <CourseMap subjectName={subject.name} chapters={chapters} />
        </CardContent>
      </Card>
    </div>
  );
}
