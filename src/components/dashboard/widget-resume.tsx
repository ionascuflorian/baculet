import Link from "next/link";
import { PlayCircle, ChevronRight } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { Progress } from "@/components/ui/progress";

export interface ResumeWidgetProps {
  nextLesson: {
    title: string;
    subject: { slug: string; name: string };
    chapter: { slug: string; title: string };
    slug: string;
  } | null | undefined;
  doneCount: number;
  totalLessons: number;
  totalChapters: number;
  chaptersDone: number;
}

export function ResumeWidget({
  nextLesson,
  doneCount,
  totalLessons,
  totalChapters,
  chaptersDone,
}: ResumeWidgetProps) {
  const pct = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

  return (
    <WidgetShell
      title="Continuă învățatul"
      icon={<PlayCircle className="h-4 w-4 text-accent" />}
      className="h-full"
      action={
        <Link
          href="/progres"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:text-accent-dark"
        >
          Toate materiile
        </Link>
      }
    >
      <div className="flex h-full flex-col gap-4">
{nextLesson ? (
          <Link
            href={`/materii/${nextLesson.subject.slug}/${nextLesson.chapter.slug}/${nextLesson.slug}`}
            className="surface-hover group flex items-center justify-between gap-4 rounded-2xl border-2 border-accent/20 bg-accent/[0.04] p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                <PlayCircle className="h-6 w-6 text-accent" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">
                  {nextLesson.title}
                </p>
                <p className="truncate text-sm text-subtle">
                  {nextLesson.subject.name} · {nextLesson.chapter.title}
                </p>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <div className="inset rounded-2xl p-4 text-sm text-subtle">
            {totalLessons === 0
              ? "Conținutul se pregătește. Între timp, explorează materiile."
              : "Felicitări! Ai parcurs toate lecțiile disponibile. 🎉"}
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span className="text-subtle">Progres general</span>
            <span className="text-ink">
              {doneCount}/{totalLessons} lecții
            </span>
          </div>
          <Progress value={pct} />
          <p className="mt-1.5 text-xs font-semibold text-subtle">
            {chaptersDone}/{totalChapters} capitole parcurse
          </p>
        </div>
      </div>
    </WidgetShell>
  );
}
