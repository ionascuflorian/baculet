"use client";

import { cn } from "@/lib/utils";
import { masteryLevel, masteryLabel } from "@/lib/mastery";

export function MasteryBar({ mastery }: { mastery: number }) {
  const level = masteryLevel(mastery);
  const label = masteryLabel(level);
  const color =
    mastery < 30 ? "bg-danger" : mastery < 60 ? "bg-warning" : mastery < 80 ? "bg-accent" : mastery < 95 ? "bg-success" : "bg-gradient-to-r from-success to-accent";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className={cn(mastery >= 80 ? "text-success" : mastery >= 60 ? "text-accent" : "text-subtle")}>{label}</span>
        <span className="text-subtle">{mastery}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-feather">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${mastery}%` }} />
      </div>
    </div>
  );
}
