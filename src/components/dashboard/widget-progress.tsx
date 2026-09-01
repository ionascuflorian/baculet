import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";

export interface SubjectMastery {
  slug: string;
  name: string;
  mastery: number;
}

export function ProgressWidget({ subjects }: { subjects: SubjectMastery[] }) {
  return (
    <WidgetShell
      title="Progresul tău"
      icon={<BarChart3 className="h-4 w-4 text-accent" />}
      className="h-full"
      action={
        <Link
          href="/progres"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:text-accent-dark"
        >
          Detalii
        </Link>
      }
    >
      {subjects.length === 0 ? (
        <p className="text-sm text-subtle">
          Începe să exersezi ca să vezi progresul pe materii.
        </p>
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => (
            <div key={s.slug}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-bold text-ink">{s.name}</span>
                <span className="text-xs font-bold text-subtle">
                  {s.mastery}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-feather">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${s.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}