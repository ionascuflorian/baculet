import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";

export interface WeakConcept {
  conceptId: string;
  mastery: number;
  concept: { name: string };
}

export function WeakWidget({ items }: { items: WeakConcept[] }) {
  return (
    <WidgetShell
      title="Pentru tine"
      icon={<AlertTriangle className="h-4 w-4 text-warning" />}
      className="h-full"
      action={
        <Link
          href="/recapitulare"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:text-accent-dark"
        >
          Exersează →
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-subtle">
          Niciun concept cu dificultăți. Continuă exersarea!
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((w) => (
            <li
              key={w.conceptId}
              className="rounded-xl border border-feather bg-card p-3"
            >
              <p className="text-sm font-bold text-ink">{w.concept.name}</p>
              <p className="text-xs text-subtle">
                Mastery {w.mastery}% — mai avem de lucru.
              </p>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}