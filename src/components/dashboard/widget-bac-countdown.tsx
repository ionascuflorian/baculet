"use client";

import { useSyncExternalStore } from "react";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { startOfDay } from "@/lib/streak";
import { firstExamOfYear } from "@/lib/exam-dates";

const emptySubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

function daysUntil(target: Date, now: Date): number {
  return Math.ceil(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / 86_400_000
  );
}

export function BacCountdownWidget() {
  const mounted = useHydrated();
  const now = new Date();
  const exam = firstExamOfYear(now.getFullYear());

  if (!mounted) {
    return (
      <WidgetShell
        title="Cât mai e până la BAC"
        icon={<GraduationCap className="h-4 w-4 text-accent" />}
        className="h-full"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-4xl font-extrabold text-ink">…</p>
            <p className="text-sm text-subtle">Se încarcă…</p>
          </div>
        </div>
      </WidgetShell>
    );
  }

  if (!exam) {
    return (
      <WidgetShell
        title="Cât mai e până la BAC"
        icon={<GraduationCap className="h-4 w-4 text-accent" />}
        className="h-full"
      >
        <p className="text-sm text-subtle">
          Calendarul BAC pentru acest an nu e încă disponibil.
        </p>
      </WidgetShell>
    );
  }

  const target = new Date(`${exam.date}T00:00:00`);
  const days = daysUntil(target, new Date());
  const dateLabel = target.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  let state: "idle" | "soon" | "imminent" | "today" | "passed";
  if (days > 30) state = "idle";
  else if (days > 7) state = "soon";
  else if (days > 0) state = "imminent";
  else if (days === 0) state = "today";
  else state = "passed";

  return (
    <WidgetShell
      title="Cât mai e până la BAC"
      icon={<GraduationCap className="h-4 w-4 text-accent" />}
      className="h-full"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {state === "passed" || state === "today"
              ? "🎓"
              : Math.max(days, 0)}
            {state !== "passed" && state !== "today" && (
              <span className="ml-2 text-base font-bold text-subtle">
                {days === 1 ? "zi" : "zile"}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm font-bold text-ink">
            {state === "passed"
              ? "BAC a început! Pregătirea dă roade."
              : state === "today"
                ? "Astăzi e prima probă. Mult succes!"
                : exam.title}
          </p>
          <p className="text-xs font-semibold text-subtle">
            {dateLabel}
            {state !== "passed" && state !== "today" && ` · mai sunt ${Math.max(days, 0)}`}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-extrabold",
            state === "idle" && "bg-accent/10 text-accent",
            state === "soon" && "bg-warning/15 text-warning",
            (state === "imminent" || state === "today") &&
              "bg-danger/10 text-danger",
            state === "passed" && "bg-success/10 text-success"
          )}
        >
          {state === "idle" && "Pe drum bun"}
          {state === "soon" && "Se apropie"}
          {state === "imminent" && "E aproape!"}
          {state === "today" && "Astăzi!"}
          {state === "passed" && "În desfășurare"}
        </span>
      </div>
    </WidgetShell>
  );
}
