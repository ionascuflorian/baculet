"use client";

import { paletteToInlineStyle, type Palette } from "@/components/themes/palette";
import { cn } from "@/lib/utils";

export function ThemePreview({
  palette,
  className,
}: {
  palette: Palette;
  className?: string;
}) {
  return (
    <div
      style={paletteToInlineStyle(palette)}
      className={cn(
        "rounded-2xl border bg-background p-4 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          B
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">Titlul lecției</p>
          <p className="truncate text-xs text-subtle">Modulul · subtitlu</p>
        </div>
        <span className="ml-auto rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">
          7 zile
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="h-2 rounded bg-ink/10" />
        <div className="h-2 w-3/4 rounded bg-ink/10" />
      </div>

      <div className="mt-3 rounded-xl border border-feather bg-card p-3">
        <p className="text-xs font-semibold text-ink">Conținut pe card</p>
        <p className="mt-1 text-xs text-subtle">
          O mostră de text secundar pentru a simți tema.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white">
          Buton principal
        </span>
        <span className="rounded-lg border border-feather px-3 py-1.5 text-xs font-bold text-ink">
          Buton contur
        </span>
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
          →
        </span>
      </div>
    </div>
  );
}