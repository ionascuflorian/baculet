"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderOpen, ChevronRight, FileText, ListChecks, FolderTree, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface MapLesson {
  id: string;
  title: string;
  slug: string;
  exerciseCount: number;
  hasQuiz: boolean;
  unitId: string | null;
}

export interface MapUnit {
  id: string;
  title: string;
  slug: string;
  type: string | null;
  lessons: MapLesson[];
}

export interface MapChapter {
  id: string;
  title: string;
  slug: string;
  units: MapUnit[];
  looseLessons: MapLesson[];
}

export function CourseMap({
  subjectName,
  chapters,
}: {
  subjectName: string;
  chapters: MapChapter[];
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(chapters.map((c) => c.id)));

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {chapters.length === 0 && (
        <p className="text-sm font-semibold text-subtle">
          Nicio modul încă. Adaugă un modul pentru a construi harta.
        </p>
      )}

      {chapters.map((chapter) => {
        const expanded = open.has(chapter.id);
        const hasUnits = chapter.units.length > 0;
        return (
          <Card key={chapter.id}>
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => toggle(chapter.id)}
                className="flex w-full items-center gap-2 p-4 text-left"
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-subtle transition-transform ${expanded ? "rotate-90" : ""}`}
                />
                <FolderOpen className="h-5 w-5 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate font-bold text-ink">{chapter.title}</span>
                {hasUnits && <BookOpen className="h-3.5 w-3.5 text-subtle" />}
                <span className="text-xs font-semibold text-subtle">
                  {chapter.units.reduce((n, u) => n + u.lessons.length, 0) + chapter.looseLessons.length} lecții
                </span>
              </button>

              {expanded && (
                <div className="space-y-3 border-t border-feather p-4">
                  {hasUnits &&
                    chapter.units.map((unit) => (
                      <div key={unit.id} className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                          <FolderTree className="h-4 w-4 text-warning" />
                          {unit.title}
                          {unit.type && (
                            <span className="rounded-full bg-feather px-2 py-0.5 text-[10px] font-extrabold text-subtle">
                              {unit.type}
                            </span>
                          )}
                        </p>
                        <div className="space-y-1.5 pl-5">
                          {unit.lessons.map((l) => (
                            <LessonRow key={l.id} lesson={l} />
                          ))}
                        </div>
                      </div>
                    ))}

                  {chapter.looseLessons.length > 0 && (
                    <div className="space-y-1.5">
                      {!hasUnits && <p className="text-xs font-bold text-subtle">Lecții</p>}
                      {chapter.looseLessons.map((l) => (
                        <LessonRow key={l.id} lesson={l} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function LessonRow({ lesson: l }: { lesson: MapLesson }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-feather bg-card px-3 py-2">
      <FileText className="h-4 w-4 shrink-0 text-subtle" />
      <Link
        href={`/admin/lectii/${l.id}`}
        className="min-w-0 flex-1 truncate text-sm font-bold text-ink hover:text-accent hover:underline"
      >
        {l.title}
      </Link>
      {l.hasQuiz && (
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-extrabold text-success">
          quiz
        </span>
      )}
      <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-extrabold text-accent">
        <ListChecks className="h-3 w-3" /> {l.exerciseCount}
      </span>
    </div>
  );
}
