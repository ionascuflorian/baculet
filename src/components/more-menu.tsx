"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Repeat, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/recapitulare", label: "Recapitulare", icon: Repeat },
  { href: "/prieteni", label: "Prieteni", icon: Users },
  { href: "/clasament", label: "Clasament", icon: Trophy },
];

export function MoreMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const sectionActive = items.some((item) => {
    return pathname === item.href || pathname.startsWith(item.href + "/");
  });

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          sectionActive ? "text-accent" : "text-subtle hover:text-ink"
        )}
      >
        Mai mult
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            sectionActive ? "text-accent" : "text-subtle",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Mai multe opțiuni"
          className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border-2 border-feather bg-card p-1.5 shadow-xl"
        >
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-subtle hover:bg-ink/5 hover:text-ink"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}