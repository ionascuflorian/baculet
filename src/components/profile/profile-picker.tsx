"use client";

import { Calculator, BookOpen, Loader2, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROFILE_META, type ProfileId } from "@/lib/profile";

const ICONS: Record<ProfileId, LucideIcon> = {
  REAL: Calculator,
  HUMAN: BookOpen,
  TECH: Wrench,
};

export function ProfilePicker({
  value,
  onChange,
  disabled,
}: {
  value: ProfileId | null;
  onChange: (id: ProfileId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PROFILE_META.map((p) => {
        const Icon = ICONS[p.id];
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(p.id)}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition-all",
              active
                ? "border-accent bg-accent/10 shadow-sm"
                : "border-feather bg-card hover:border-accent/40",
              disabled && !active && "opacity-50",
              disabled && active && "cursor-wait"
            )}
          >
            <span
              className={cn(
                "mb-3 flex h-11 w-11 items-center justify-center rounded-2xl",
                active ? "bg-accent text-white" : "bg-ink/5 text-ink"
              )}
            >
              {disabled && active ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </span>
            <p className="text-base font-extrabold text-ink">{p.label}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-accent">
              {p.specializations}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-subtle">
              {p.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
