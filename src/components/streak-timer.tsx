"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { streakDeadline } from "@/lib/streak";

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) return `${days}z ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const WARNING_MS = 6 * 3600_000; // sub 6 ore -> avertisment
const DANGER_MS = 2 * 3600_000; // sub 2 ore -> pericol

type Status = "safe" | "warning" | "danger" | "broken" | "idle";

function statusFor(msLeft: number | null): Status {
  if (msLeft === null) return "idle";
  if (msLeft <= 0) return "broken";
  if (msLeft < DANGER_MS) return "danger";
  if (msLeft < WARNING_MS) return "warning";
  return "safe";
}

export function StreakTimer({
  count,
  lastActiveAt,
  variant = "nav",
}: {
  count: number;
  lastActiveAt: string | null;
  variant?: "nav" | "widget";
}) {
  const [now, setNow] = useState(() => new Date());

  const deadline = useMemo(
    () => streakDeadline(lastActiveAt ? new Date(lastActiveAt) : null),
    [lastActiveAt]
  );

  // Tick-uri dese doar în „zona de pericol” (sub 2 ore); în rest, o dată la 30s.
  useEffect(() => {
    const msLeft = deadline ? deadline.getTime() - Date.now() : null;
    const delay = msLeft !== null && msLeft < DANGER_MS ? 1000 : 30_000;
    const id = setInterval(() => setNow(new Date()), delay);
    return () => clearInterval(id);
  }, [deadline]);

  const msLeft = deadline ? deadline.getTime() - now.getTime() : null;
  const status = statusFor(msLeft);

  const flameColor = cn(
    status === "broken" && "text-ink/30",
    status === "danger" && "text-danger animate-pulse",
    (status === "warning" || status === "safe") && "text-warning",
    status === "idle" && "text-ink/30"
  );

  const timerColor = cn(
    "font-semibold tabular-nums",
    status === "broken" && "text-ink/30",
    status === "danger" && "text-danger",
    (status === "warning" || status === "safe") && "text-subtle",
    status === "idle" && "text-subtle"
  );

  if (variant === "widget") {
    const label =
      status === "broken"
        ? "Seria s-a întrerupt. Începe una nouă azi!"
        : status === "idle"
          ? "Începe să înveți ca să-ți pornești seria."
          : "Mai ai timp să-ți păstrezi seria:";

    return (
      <div className="surface flex w-fit items-center gap-3 rounded-2xl px-4 py-3">
        <Flame className={cn("h-7 w-7", flameColor)} />
        <div className="leading-tight">
          <p className="text-lg font-extrabold text-ink">
            {count} {count === 1 ? "zi" : "zile"}
            {status === "broken" && " · oprită"}
          </p>
          <p className={cn("text-xs", timerColor)}>
            {label}
            {status !== "broken" && status !== "idle" && (
              <span className="ml-1 font-bold">
                {formatDuration(msLeft!)}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center rounded-full px-2.5 py-1"
      title={
        status === "broken"
          ? "Seria s-a întrerupt"
          : status === "idle"
            ? "Începe să înveți pentru a porni seria"
            : `Mai ai ${formatDuration(msLeft!)} să-ți păstrezi seria`
      }
    >
      <span className={cn("flex items-center gap-1 text-sm font-bold", flameColor)}>
        <Flame className="h-4 w-4" />
        {count}
      </span>
      {status !== "idle" && (
        <span className={cn("text-[10px] leading-none", timerColor)}>
          {status === "broken" ? "întreruptă" : formatDuration(msLeft!)}
        </span>
      )}
    </div>
  );
}