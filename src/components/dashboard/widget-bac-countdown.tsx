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

function startOfMonthDay(d: Date): Date {
  return startOfDay(d);
}

export function BacCountdownWidget({
  startDate,
  endDate,
  nextSessionStartDate,
}: {
  startDate?: string | null;
  endDate?: string | null;
  nextSessionStartDate?: string | null;
}) {
  const mounted = useHydrated();
  const now = new Date();
  const today = startOfMonthDay(now);

  const fallback = firstExamOfYear(now.getFullYear());
  const start = startDate
    ? new Date(`${startDate}T00:00:00`)
    : fallback
      ? new Date(`${fallback.date}T00:00:00`)
      : null;
  const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const nextSession = nextSessionStartDate
    ? new Date(`${nextSessionStartDate}T00:00:00`)
    : null;
  const nextSessionT = nextSession ? startOfDay(nextSession).getTime() : null;

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

  if (!start) {
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

  const startT = startOfDay(start).getTime();
  const endT = end ? startOfDay(end).getTime() : null;
  const todayT = today.getTime();

  const fmt = (d: Date) =>
    d.toLocaleDateString("ro-RO", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  let state: "idle" | "soon" | "imminent" | "today" | "ongoing" | "ended";
  let big: string;
  let unit: string;
  let title: string;
  let caption: string;

  if (endT !== null && todayT > endT) {
    state = "ended";
    if (nextSessionT !== null && todayT < nextSessionT) {
      const days = Math.ceil((nextSessionT - todayT) / 86_400_000);
      big = String(days);
      unit = days === 1 ? "zi" : "zile";
      title = "Mai sunt până la sesiunea următoare";
      caption = `BAC s-a încheiat pe ${fmt(end!)}. Următoarea sesiune începe pe ${fmt(
        nextSession!
      )}.`;
    } else if (nextSessionT !== null) {
      big = "🎓";
      unit = "";
      title = "BAC s-a terminat.";
      caption =
        nextSessionT === todayT
          ? "Astăzi începe sesiunea următoare."
          : `Sesiunea următoare a început pe ${fmt(nextSession!)}.`;
    } else {
      big = "🎓";
      unit = "";
      title = "BAC s-a terminat. Felicitări!";
      caption = `S-a încheiat pe ${fmt(end!)}.`;
    }
  } else if (todayT >= startT) {
    state = "ongoing";
    big = "🎓";
    unit = "";
    title = "BAC este în desfășurare.";
    caption = `A început pe ${fmt(start)}${endT ? `, se termină pe ${fmt(end!)}` : ""}.`;
  } else {
    const days = Math.ceil((startT - todayT) / 86_400_000);
    if (days > 30) state = "idle";
    else if (days > 7) state = "soon";
    else if (days > 0) state = "imminent";
    else state = "today";

    if (state === "today") {
      big = "🎓";
      unit = "";
      title = "Astăzi e prima probă. Mult succes!";
      caption = fmt(start);
    } else {
      big = String(Math.max(days, 0));
      unit = days === 1 ? "zi" : "zile";
      title = fallback?.title ?? "BAC — prima probă";
      caption = `${fmt(start)} · mai sunt ${Math.max(days, 0)}`;
    }
  }

  return (
    <WidgetShell
      title="Cât mai e până la BAC"
      icon={<GraduationCap className="h-4 w-4 text-accent" />}
      className="h-full"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            {big}
            {unit && (
              <span className="ml-2 text-base font-bold text-subtle">
                {unit}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm font-bold text-ink">{title}</p>
          <p className="text-xs font-semibold text-subtle">{caption}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-extrabold",
            state === "idle" && "bg-accent/10 text-accent",
            state === "soon" && "bg-warning/15 text-warning",
            (state === "imminent" || state === "today") &&
              "bg-danger/10 text-danger",
            state === "ongoing" && "bg-accent/10 text-accent",
            state === "ended" && "bg-success/10 text-success"
          )}
        >
          {state === "idle" && "Pe drum bun"}
          {state === "soon" && "Se apropie"}
          {state === "imminent" && "E aproape!"}
          {state === "today" && "Astăzi!"}
          {state === "ongoing" && "În desfășurare"}
          {state === "ended" && "Terminat"}
        </span>
      </div>
    </WidgetShell>
  );
}