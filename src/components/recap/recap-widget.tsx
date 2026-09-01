import Link from "next/link";
import { Brain, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { Button } from "@/components/ui/button";

interface RecapItem {
  id: string;
  text: string;
  concept: string | null;
  quizTitle: string;
  failCount: number;
}

export function RecapWidget({ items, dueCount }: { items: RecapItem[]; dueCount: number }) {
  return (
    <WidgetShell
      title="Recapitulare"
      icon={
        dueCount === 0 ? (
          <Brain className="h-4 w-4 text-success" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )
      }
      className="h-full"
      action={
        dueCount > 0 ? (
          <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
            {dueCount} de revizuit
          </span>
        ) : (
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
            La zi
          </span>
        )
      }
    >
      {dueCount === 0 ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
            <div>
              <p className="text-sm font-extrabold text-ink">Ești la zi! 🎉</p>
              <p className="text-sm text-subtle">
                Nicio recapitulare urgentă. Continuă să exersezi.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.slice(0, 3).map((it) => (
            <div key={it.id} className="rounded-xl border border-feather p-3">
              <p className="text-sm font-bold text-ink line-clamp-2">{it.text}</p>
              <p className="mt-0.5 text-xs text-subtle">
                {it.quizTitle}{it.concept && ` · ${it.concept}`} · greșit {it.failCount}x
              </p>
            </div>
          ))}
          <Button asChild size="sm" className="w-full">
            <Link href="/recapitulare">
              Începe recapitularea <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </WidgetShell>
  );
}