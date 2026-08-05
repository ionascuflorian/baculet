"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Flame, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { addDays, streakDeadline } from "@/lib/streak";

export interface StreakActivityDay {
  date: string; // ISO
  count: number;
}

const CELL = "h-2.5 w-2.5 rounded-[3px]";

const LEVEL_CLASS = [
  "bg-ink/10",
  "bg-success/25",
  "bg-success/45",
  "bg-success/70",
  "bg-success",
];

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}z ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function bestStreak(days: Date[]): number {
  if (days.length === 0) return 0;
  const sorted = [...days]
    .map((d) => d.getTime())
    .sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const delta = (sorted[i] - sorted[i - 1]) / 86_400_000;
    if (delta === 1) {
      run += 1;
      best = Math.max(best, run);
    } else if (delta > 1) {
      run = 1;
    }
  }
  return best;
}

const MONTHS = [
  "ian", "feb", "mar", "apr", "mai", "iun",
  "iul", "aug", "sep", "oct", "nov", "dec",
];

const emptySubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

interface HeatmapProps {
  activities: Map<string, number>;
  todayKey: string;
  todayDate: Date;
}

function Heatmap({ activities, todayKey, todayDate }: HeatmapProps) {
  // 53 săptămâni înapoi (an GitHub), începând cu ultima zi de duminică.
  const weeks = useMemo(() => {
    const sunday = addDays(todayDate, -todayDate.getDay());
    const start = addDays(sunday, -(52 * 7));
    const columns: Date[][] = [];
    for (let w = 0; w < 53; w++) {
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) {
        col.push(addDays(start, w * 7 + d));
      }
      columns.push(col);
    }
    return columns;
  }, [todayDate]);

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  const monthLabels = useMemo(
    () =>
      weeks.map((col) => {
        const first = dayKey(col[0]);
        return { label: MONTHS[col[0].getMonth()], first };
      }),
    [weeks]
  );

  return (
    <div className="overflow-x-auto pb-1" dir="ltr">
      <div className="w-fit">
        <div className="flex gap-[3px]">
          {monthLabels.map((m, i) => {
            const prevFirst = i > 0 ? monthLabels[i - 1].first : null;
            const show =
              prevFirst === null ||
              m.first.slice(0, 7) !== prevFirst!.slice(0, 7);
            return (
              <span
                key={m.first}
                className={cn(
                  "w-2.5 shrink-0 text-[8px] font-semibold leading-none text-subtle",
                  show ? "" : "invisible"
                )}
              >
                {m.label}
              </span>
            );
          })}
        </div>
        <div className="mt-1 flex gap-[3px]">
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {col.map((d, di) => {
                const key = dayKey(d);
                const count = activities.get(key) ?? 0;
                const isToday = key === todayKey;
                const isFuture = d.getTime() > todayDate.getTime();
                const level = levelFor(count);
                return (
                  <span
                    key={di}
                    title={
                      isFuture
                        ? undefined
                        : count > 0
                          ? `${d.toLocaleDateString("ro-RO")} · ${count} ${count === 1 ? "acțiune" : "acțiuni"}`
                          : d.toLocaleDateString("ro-RO")
                    }
                    className={cn(
                      CELL,
                      !isFuture && LEVEL_CLASS[level],
                      isFuture && "invisible",
                      isToday && "ring-1 ring-accent"
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold text-subtle">Mai puțin</span>
          {LEVEL_CLASS.map((c, i) => (
            <span key={i} className={cn(CELL, c)} />
          ))}
          <span className="text-[10px] font-semibold text-subtle">Mai mult</span>
        </div>
      </div>
    </div>
  );
}

export function StreakWidget({
  streakCount,
  lastActiveAt,
  activities,
  today,
}: {
  streakCount: number;
  lastActiveAt: string | null;
  activities: StreakActivityDay[];
  today: string; // ISO start-of-day, calculat pe server (consistență la hydration)
}) {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayDate = useMemo(() => new Date(today), [today]);
  const todayKey = todayDate.toISOString().slice(0, 10);

  const activityMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of activities) {
      const key = a.date.slice(0, 10);
      m.set(key, (m.get(key) ?? 0) + a.count);
    }
    return m;
  }, [activities]);

  const activeDays = useMemo(
    () =>
      [...activityMap.entries()]
        .filter(([key]) => key <= todayKey)
        .map(([key]) => new Date(key + "T00:00:00.000Z")),
    [activityMap, todayKey]
  );

  const studiedToday = activityMap.has(todayKey);
  const best = bestStreak(activeDays);
  const activeCount = activeDays.length;

  const deadline = useMemo(
    () => streakDeadline(lastActiveAt ? new Date(lastActiveAt) : null),
    [lastActiveAt]
  );

  // Seria e „întreruptă” de la miezul nopții după ziua-limită. Comparăm cu
  // `today` (dată server) ca mesajul să fie identic pe server și client.
  const broken =
    streakCount > 0 && deadline !== null && deadline.getTime() <= todayDate.getTime();

  let message: string;
  let sub: React.ReactNode = null;
  if (streakCount === 0 && !studiedToday) {
    message = "Începe să înveți ca să-ți pornești prima serie.";
  } else if (broken) {
    message = "Seria s-a întrerupt. Începe una nouă azi!";
  } else if (studiedToday) {
    message = `Ai studiat azi! Seria ta de ${streakCount} ${streakCount === 1 ? "zi" : "zile"} continuă.`;
  } else {
    message = `Ai studiat ${streakCount} ${streakCount === 1 ? "zi" : "zile"} la rând! Învață azi ca să nu pierzi seria.`;
    if (hydrated && deadline) {
      const left = deadline.getTime() - now.getTime();
      if (left > 0) sub = `Mai ai ${formatDuration(left)} la dispoziție.`;
    }
  }

  return (
    <WidgetShell
      title="Seria de studiu"
      icon={<Flame className="size-4 text-accent" />}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-extrabold tracking-tight text-ink">
            {streakCount}
            <span className="ml-1 text-sm font-bold text-subtle">
              {streakCount === 1 ? "zi" : "zile"} de serie
            </span>
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold leading-snug",
              broken ? "text-danger" : "text-accent"
            )}
          >
            {message}
          </p>
          {sub && <p className="mt-0.5 text-xs font-semibold text-subtle">{sub}</p>}
        </div>
        <Flame
          className={cn(
            "h-9 w-9 shrink-0",
            broken
              ? "text-ink/25"
              : streakCount > 0
                ? studiedToday
                  ? "text-warning"
                  : "text-warning/70"
                : "text-ink/25"
          )}
        />
      </div>

      <Heatmap
        activities={activityMap}
        todayKey={todayKey}
        todayDate={todayDate}
      />

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-feather pt-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-warning" />
          <div>
            <p className="text-lg font-extrabold leading-none text-ink">{best}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-subtle">cea mai lungă</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CalendarCheck className="size-4 text-success" />
          <div>
            <p className="text-lg font-extrabold leading-none text-ink">
              {activeCount}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-subtle">zile active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-accent" />
          <div>
            <p className="text-lg font-extrabold leading-none text-ink">
              {streakCount}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-subtle">seria actuală</p>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}
