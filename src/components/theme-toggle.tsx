"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const modes = ["system", "light", "dark"] as const;
const icons = { system: Monitor, light: Sun, dark: Moon };
const labels = { system: "Pe sistem", light: "Luminos", dark: "Întunecat" };

const emptySubscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const active = (mode: (typeof modes)[number]) => {
    if (!mounted) return mode === "system";
    if (mode === "system") return theme === "system";
    return resolvedTheme === mode;
  };

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <>
      {/* Mobile: un singur comutator luminos / întunecat */}
      <div className={cn("md:hidden", className)}>
        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label={
            isDark ? "Comută la modul luminos" : "Comută la modul întunecat"
          }
          title={isDark ? "Mod luminos" : "Mod întunecat"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-ink shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {isDark ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Desktop: control complet (sistem / luminos / întunecat) */}
      <div
        className={cn(
          "inset hidden items-center gap-0.5 rounded-full p-0.5 md:flex",
          className
        )}
        role="radiogroup"
        aria-label="Temă"
      >
        {modes.map((mode) => {
          const Icon = icons[mode];
          const isActive = active(mode);
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={labels[mode]}
              title={labels[mode]}
              onClick={() => setTheme(mode)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                isActive
                  ? "bg-card text-ink shadow-sm"
                  : "text-subtle hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </>
  );
}