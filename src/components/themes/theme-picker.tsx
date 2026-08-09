"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Palette as PaletteIcon } from "lucide-react";
import { setUserTheme } from "@/lib/actions/themes";
import type { Palette } from "@/components/themes/palette";
import { cn } from "@/lib/utils";

type ThemeOption = {
  slug: string;
  name: string;
  light: Palette;
  dark: Palette;
};

export function ThemePicker({
  themes,
  current,
  onSelected,
}: {
  themes: ThemeOption[];
  current: string | null;
  onSelected?: (slug: string | null) => void;
}) {
  const router = useRouter();
  const [applied, setApplied] = useState(current);
  const [pending, startTransition] = useTransition();

  function applyOnDocument(slug: string | null) {
    document.documentElement.dataset.theme = slug ?? "default";
  }

  const select = (slug: string | null) => {
    if (pending) return;
    applyOnDocument(slug);
    setApplied(slug);
    onSelected?.(slug);
    startTransition(async () => {
      try {
        await setUserTheme(slug);
      } catch {
        applyOnDocument(applied);
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 transition-colors",
          applied === null
            ? "border-accent bg-accent/5"
            : "border-feather hover:border-accent/50"
        )}
        onMouseEnter={() => applyOnDocument(null)}
        onMouseLeave={() => applyOnDocument(applied)}
        onClick={() => select(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select(null);
          }
        }}
        role="radio"
        aria-checked={applied === null}
        tabIndex={0}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f5f5f7] to-[#d2d2d7]">
          <PaletteIcon className="h-5 w-5 text-ink" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Default</p>
          <p className="text-xs text-subtle">Stilul clasic Baculet</p>
        </div>
        {applied === null && <Check className="h-5 w-5 text-accent" />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {themes.map((theme) => {
          const selected = applied === theme.slug;
          return (
            <button
              key={theme.slug}
              type="button"
              onClick={() => select(theme.slug)}
              onMouseEnter={() => applyOnDocument(theme.slug)}
              onMouseLeave={() => applyOnDocument(applied)}
              disabled={pending}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors disabled:opacity-60",
                selected
                  ? "border-accent bg-accent/5"
                  : "border-feather hover:border-accent/50"
              )}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${theme.light.accent ?? "#0a7cff"}, ${
                    theme.light.accentDark ?? theme.light.accent ?? "#0a7cff"
                  })`,
                }}
              >
                <span
                  className="h-5 w-5 rounded-md"
                  style={{ backgroundColor: theme.light.background ?? "#fff" }}
                />
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-ink">{theme.name}</p>
                {selected &&
                  (pending ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
                  ) : (
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                  ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}