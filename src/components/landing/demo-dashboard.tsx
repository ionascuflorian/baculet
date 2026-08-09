"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Flame, ListChecks, Sparkles, Sun } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { BacCountdownWidget } from "@/components/dashboard/widget-bac-countdown";
import { Heatmap } from "@/components/landing/heatmap";
import { demoActivities, demoSubjects } from "@/components/landing/mock-data";
import { useHydrated } from "@/components/landing/use-hydrated";

export function DemoDashboard() {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const activities = useMemo(() => demoActivities(today, 26), [today]);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Bună dimineața" : hour < 18 ? "Bună ziua" : "Bună seara";

  return (
    <div className="relative mx-auto w-full max-w-2xl text-left">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[4rem] bg-gradient-to-tr from-accent/25 via-brand/15 to-warning/15 blur-3xl"
      />

      <div className="relative rounded-[2rem] border border-feather/60 bg-card/60 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl sm:p-5 dark:border-white/10">
        <div className="grid gap-4 sm:grid-cols-2">
          <WidgetShell className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold tracking-tight text-ink">
                  {hydrated ? `${greeting}, Maria!` : "Bună ziua, Maria!"}{" "}
                  <Sun className="ml-1 inline h-5 w-5 text-warning" />
                </p>
                <p className="mt-0.5 text-sm text-subtle">
                  Continuă seria și azi — ești la 12 zile. Un test grilă îți ia
                  doar 10 minute.
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-extrabold text-success">
                <Sparkles className="h-3.5 w-3.5" /> +25 XP disponibile azi
              </span>
            </div>
          </WidgetShell>

          <BacCountdownWidget />

          <WidgetShell
            title="Seria de studiu"
            icon={<Flame className="size-4 text-accent" />}
          >
            <div className="mb-3 flex items-center gap-3">
              <Flame className="h-7 w-7 shrink-0 text-warning" />
              <p className="text-xl font-extrabold tracking-tight text-ink">
                12
                <span className="ml-1 text-sm font-bold text-subtle">
                  zile la rând
                </span>
              </p>
            </div>
            <Heatmap activities={activities} today={today} weeksBack={26} />
          </WidgetShell>

          <WidgetShell
            title="Progresul tău"
            icon={<ListChecks className="size-4 text-accent" />}
          >
            <div className="space-y-3.5">
              {demoSubjects.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold">
                    <span className="text-ink">{s.name}</span>
                    <span className="text-subtle">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className={`h-full rounded-full ${s.color}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </WidgetShell>

          <WidgetShell
            title="Continuă de unde ai rămas"
            icon={<BookOpen className="size-4 text-accent" />}
            className="sm:col-span-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">
                  Capitolul 3 · Poezia romantică
                </p>
                <p className="text-xs font-semibold text-subtle">
                  Lecția 8 din 12 · „Luceafărul” — comentariu
                </p>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-extrabold text-accent">
                Continuă →
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-brand-dark"
                style={{ width: "60%" }}
              />
            </div>
          </WidgetShell>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="surface absolute -top-5 right-0 hidden rotate-2 items-center gap-2 rounded-2xl px-4 py-2.5 sm:flex lg:-right-4"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning/15">
          <Flame className="h-4 w-4 text-warning" />
        </span>
        <div>
          <p className="text-sm font-extrabold leading-none text-ink">Seria: 12 zile</p>
          <p className="mt-0.5 text-[10px] font-semibold text-subtle">
            azi: +120 XP
          </p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="surface absolute -bottom-5 left-0 hidden -rotate-2 items-center gap-2 rounded-2xl px-4 py-2.5 sm:flex lg:-left-4"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/15">
          <Sparkles className="h-4 w-4 text-success" />
        </span>
        <div>
          <p className="text-sm font-extrabold leading-none text-ink">Progres 60%</p>
          <p className="mt-0.5 text-[10px] font-semibold text-subtle">
            în „Poezia romantică”
          </p>
        </div>
      </motion.div>
    </div>
  );
}
