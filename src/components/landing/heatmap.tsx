"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/components/landing/use-hydrated";

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

const MONTHS = [
  "ian", "feb", "mar", "apr", "mai", "iun",
  "iul", "aug", "sep", "oct", "nov", "dec",
];

export function Heatmap({
  activities,
  today,
  weeksBack = 53,
}: {
  activities: Map<string, number>;
  today: Date;
  weeksBack?: number;
}) {
  const hydrated = useHydrated();

  const columns = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() - weeksBack * 7);
    const cols: Date[][] = [];
    for (let w = 0; w < weeksBack; w++) {
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        col.push(day);
      }
      cols.push(col);
    }
    return cols;
  }, [today, weeksBack]);

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const todayKey = dayKey(today);

  const monthLabels = useMemo(
    () =>
      columns.map((col) => ({
        label: MONTHS[col[0].getMonth()],
        first: dayKey(col[0]),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns]
  );

  if (!hydrated) return null;

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
          {columns.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {col.map((d, di) => {
                const key = dayKey(d);
                const count = activities.get(key) ?? 0;
                const isToday = key === todayKey;
                const isFuture = d.getTime() > today.getTime();
                const level = levelFor(count);
                return (
                  <span
                    key={di}
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
