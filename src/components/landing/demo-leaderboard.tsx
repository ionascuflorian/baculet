"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { UserAvatar } from "@/components/friends/user-avatar";
import { cn } from "@/lib/utils";
import { demoBoard } from "@/components/landing/mock-data";

type Period = "week" | "all";

const medalStyle: Record<number, string> = {
  1: "bg-[#F59E0B]/15 text-[#F59E0B]",
  2: "bg-[#94A3B8]/15 text-[#94A3B8]",
  3: "bg-[#B45309]/15 text-[#B45309]",
};

export function DemoLeaderboard() {
  const [period, setPeriod] = useState<Period>("week");

  const rows =
    period === "week"
      ? demoBoard.slice(0, 5)
      : [...demoBoard].sort((a, b) => b.xp - a.xp);

  return (
    <div className="surface mx-auto w-full max-w-xl space-y-5 rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-feather bg-card p-1">
          {(
            [
              ["week", "Săptămâna asta"],
              ["all", "Tot timpul"],
            ] as [Period, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPeriod(id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold transition-all",
                period === id
                  ? "bg-accent text-white"
                  : "text-subtle hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="hidden items-center gap-1.5 text-xs font-bold text-subtle sm:flex">
          <Users className="h-3.5 w-3.5" /> Global
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 0, 2].map((offset) => {
          const row = rows[offset];
          if (!row) return null;
          const place = offset + 1;
          return (
            <div
              key={row.id}
              className={cn(
                "relative flex flex-col items-center gap-2.5 rounded-3xl border p-4 text-center",
                place === 1
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/5"
                  : "border-feather bg-card"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl text-base font-black",
                  medalStyle[place]
                )}
              >
                {place}
              </span>
              <UserAvatar name={row.name} image={null} size="lg" />
              <div className="min-w-0 w-full">
                <p className="truncate font-bold text-ink">{row.name}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  @{row.username} · {row.xp.toLocaleString("ro-RO")} XP
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <ul className="space-y-1.5">
        {rows.slice(3).map((row, i) => (
          <li
            key={row.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5",
              row.mine
                ? "border border-accent/40 bg-accent/10"
                : "border border-feather bg-card"
            )}
          >
            <span className="w-8 text-center text-sm font-black text-subtle">
              {i + 4}
            </span>
            <UserAvatar name={row.name} image={null} size="sm" />
            <p className="min-w-0 flex-1 truncate font-semibold text-ink">
              {row.name}
              {row.mine && (
                <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold text-white">
                  TU
                </span>
              )}
            </p>
            <span className="shrink-0 text-sm font-bold text-accent">
              {row.xp.toLocaleString("ro-RO")} XP
            </span>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-subtle/70">
        XP = cele mai bune scoruri la teste × 10 + lecții completate × 25
        {period === "week" ? " (doar din săptămâna asta)" : " + bonus streak × 5"}
      </p>
    </div>
  );
}
