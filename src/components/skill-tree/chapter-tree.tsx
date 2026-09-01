import Link from "next/link";
import { Lock, CheckCircle2, PlayCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ChapterNode {
  id: string;
  slug: string;
  title: string;
  lessons: { id: string }[];
  done: number;
  pct: number;
}

export function ChapterTree({ subjectSlug, chapters }: { subjectSlug: string; chapters: ChapterNode[] }) {
  return (
    <div className="relative space-y-0">
      {/* linie verticală */}
      <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-feather/60 hidden sm:block" />
      <div className="space-y-4">
        {chapters.map((ch, idx) => {
          const recommended = idx > 0 && chapters[idx - 1].pct < 100;
          const completed = ch.pct === 100;
          return (
            <div key={ch.id} className="relative flex gap-4">
              <div
                className={cn(
                  "hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold z-10 bg-card",
                  completed ? "border-success bg-success text-white" : recommended ? "border-warning/40 bg-warning/10 text-warning" : "border-accent text-accent"
                )}
              >
                {completed ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
              </div>
              <div className="flex-1">
                <Link href={`/materii/${subjectSlug}/${ch.slug}`}>
                  <Card className={cn("transition-all hover:-translate-y-0.5 hover:shadow-md", completed && "border-success/40", recommended && "border-warning/30")}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">{completed && <CheckCircle2 className="h-4 w-4 text-success" />}{ch.title} {recommended && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">RECOMANDAT DUPĂ ANTERIOR</span>}</CardTitle>
                        <p className="text-sm text-subtle">{ch.lessons.length} lecții · {ch.done} parcurse</p>
                        <div className="mt-2 w-40 sm:w-56"><Progress value={ch.pct} /></div>
                      </div>
                      <PlayCircle className="h-5 w-5 text-accent" />
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
