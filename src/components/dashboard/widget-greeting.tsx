"use client";

import { useSyncExternalStore } from "react";
import { Quote } from "lucide-react";
import { StreakTimer } from "@/components/streak-timer";
import { quoteForDay } from "@/lib/quotes";

const emptySubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

function greetingForHour(hour: number) {
  if (hour < 5) return "Noapte bună";
  if (hour < 12) return "Bună dimineața";
  if (hour < 18) return "Bună ziua";
  return "Bună seara";
}

export function GreetingWidget({
  firstName,
  streakCount,
  lastActiveAt,
}: {
  firstName: string;
  streakCount: number;
  lastActiveAt: string | null;
}) {
  const mounted = useHydrated();
  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const today = mounted
    ? now.toLocaleDateString("ro-RO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const q = quoteForDay(now);

  return (
    <section className="surface rounded-[1.25rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-subtle">{today}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {greeting}
            {firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mt-2 text-subtle">
            Hai să continuăm învățatul. Ritmul de azi îți construiește BAC-ul de
            mâine.
          </p>
        </div>
        {streakCount > 0 && (
          <StreakTimer
            count={streakCount}
            lastActiveAt={lastActiveAt}
            variant="widget"
          />
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 border-t border-feather pt-3">
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
        <p className="text-sm leading-snug text-subtle">
          <span className="italic">&ldquo;{q.text}&rdquo;</span>{" "}
          <span className="font-semibold not-italic">— {q.author}</span>
        </p>
      </div>
    </section>
  );
}