"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Flame, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Heatmap } from "@/components/landing/heatmap";
import { demoActivities, formatRemaining } from "@/components/landing/mock-data";
import { useHydrated } from "@/components/landing/use-hydrated";

export function DemoStreak() {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const activities = useMemo(() => demoActivities(today, 26), [today]);

  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const leftToday = midnight.getTime() - now.getTime();

  const activeDays = [...activities.entries()].filter(
    ([key]) => key <= today.toISOString().slice(0, 10)
  ).length;

  return (
    <div className="surface mx-auto w-full max-w-xl space-y-5 rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15"
          >
            <Flame className="h-8 w-8 text-warning" />
          </motion.div>
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-ink">
              12
              <span className="ml-1 text-sm font-bold text-subtle">
                zile de serie
              </span>
            </p>
            <p className="mt-0.5 text-sm font-semibold text-accent">
              Ai studiat azi! Seria continuă.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-extrabold text-accent">
          Pe drum bun
        </span>
      </div>

      <Heatmap activities={activities} today={today} weeksBack={26} />

      <div className="grid grid-cols-3 gap-2 border-t border-feather pt-4">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-warning" />
          <div>
            <p className="text-lg font-extrabold leading-none text-ink">21</p>
            <p className="mt-0.5 text-[10px] font-semibold text-subtle">
              cea mai lungă
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarCheck className="size-4 text-success" />
          <div>
            <p className="text-lg font-extrabold leading-none text-ink">
              {activeDays}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-subtle">
              zile active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-accent" />
          <div>
            <p className="text-lg font-extrabold leading-none text-ink">12</p>
            <p className="mt-0.5 text-[10px] font-semibold text-subtle">
              seria actuală
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-accent/25 bg-accent/[0.06] px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold text-ink">
          <Timer className="h-4 w-4 text-accent" />
          Timp rămas până la resetarea zilei
        </span>
        <span
          className={cn(
            "text-sm font-extrabold tabular-nums",
            hydrated ? "text-accent" : "text-subtle"
          )}
        >
          {hydrated ? formatRemaining(leftToday) : "…"}
        </span>
      </div>
    </div>
  );
}
