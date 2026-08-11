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
  if (hour < 5) return { text: "Noapte bună", emoji: "🌙" };
  if (hour < 12) return { text: "Bună dimineața", emoji: "🌅" };
  if (hour < 18) return { text: "Bună ziua", emoji: "☀️" };
  return { text: "Bună seara", emoji: "🌇" };
}

function streakMessage(streak: number) {
  if (streak <= 0) {
    return "Hai să începem seria azi — un test grilă îți ia doar 10 minute.";
  }
  const rest = streak % 100;
  const unit = rest === 1 ? "zi" : rest >= 20 ? "de zile" : "zile";
  return `Continuă seria și azi — ești la ${streak} ${unit}. Un test grilă îți ia doar 10 minute.`;
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
            {greeting.text}
            {firstName ? `, ${firstName}` : ""}!{" "}
            <span aria-hidden className="align-middle">
              {greeting.emoji}
            </span>
          </h1>
          <p className="mt-2 text-subtle">{streakMessage(streakCount)}</p>
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