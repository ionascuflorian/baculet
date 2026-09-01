import Link from "next/link";
import { History } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";

export interface RecentAttempt {
  id: string;
  quiz: { title: string; subject: { name: string } };
  score: number;
  maxScore: number;
}

export function RecentWidget({ attempts }: { attempts: RecentAttempt[] }) {
  return (
    <WidgetShell
      title="Teste recente"
      icon={<History className="h-4 w-4 text-accent" />}
      className="h-full"
      action={
        <Link
          href="/progres"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:text-accent-dark"
        >
          Vezi tot progresul
        </Link>
      }
    >
      {attempts.length === 0 ? (
        <p className="text-sm text-subtle">
          Niciun test dat încă. Rezolvă un test ca să-ți vezi scorurile aici.
        </p>
      ) : (
        <ul className="space-y-2">
          {attempts.map((a) => (
            <li
              key={a.id}
              className="inset flex items-center justify-between rounded-xl p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  {a.quiz.title}
                </p>
                <p className="text-xs text-subtle">{a.quiz.subject.name}</p>
              </div>
              <span
                className={
                  a.score / a.maxScore >= 0.5
                    ? "ml-3 shrink-0 text-lg font-extrabold text-success"
                    : "ml-3 shrink-0 text-lg font-extrabold text-danger"
                }
              >
                {a.score}/{a.maxScore}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}