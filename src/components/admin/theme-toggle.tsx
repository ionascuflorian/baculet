"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setThemeEnabled } from "@/lib/actions/themes";
import { cn } from "@/lib/utils";

export function ThemeEnabledToggle({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setThemeEnabled(id, !enabled))}
      aria-pressed={enabled}
      title={enabled ? "Dezactivează" : "Activează"}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
        enabled ? "bg-accent" : "bg-ink/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-all",
          enabled ? "left-[22px]" : "left-0.5"
        )}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin text-subtle" />}
      </span>
    </button>
  );
}