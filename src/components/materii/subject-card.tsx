import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PROFILE_LABELS } from "@/lib/profile";

export interface SubjectCardData {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  chaptersCount: number;
  lessonsCount: number;
  done: number;
  pct: number;
  profiles: string[];
}

export function SubjectCard({
  subject,
  index = 0,
  dimmed = false,
}: {
  subject: SubjectCardData;
  index?: number;
  dimmed?: boolean;
}) {
  return (
    <Link href={`/materii/${subject.slug}`}>
      <Card
        className={cn(
          "animate-slide-up surface-hover h-full rounded-3xl border p-5",
          dimmed && "opacity-70"
        )}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <CardContent>
          <div className="mb-4 flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-2xl">
              {subject.icon}
            </span>
            <ChevronRight className="h-5 w-5 text-subtle" />
          </div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-ink">
            {subject.name}
          </h2>
          {subject.description && (
            <p className="mt-1 line-clamp-2 text-sm text-subtle">
              {subject.description}
            </p>
          )}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
              <span className="text-subtle">
                {subject.chaptersCount} capitole · {subject.lessonsCount} lecții
              </span>
              <span className="text-accent">{subject.pct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${subject.pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-subtle">
              {subject.done}/{subject.lessonsCount} lecții parcurse
            </p>
          </div>
          {subject.profiles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subject.profiles.map((profile) => (
                <span
                  key={profile}
                  className="rounded-full bg-ink/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-subtle"
                >
                  {PROFILE_LABELS[profile]}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
