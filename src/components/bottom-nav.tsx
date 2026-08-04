"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materii", label: "Materii", icon: BookOpen },
  { href: "/subiecte-bac", label: "Subiecte", icon: FileText },
  { href: "/progres", label: "Progres", icon: TrendingUp },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      <nav
        aria-label="Navigare principală"
        className="mx-auto flex max-w-sm items-center justify-around gap-1 rounded-[2.2rem] border border-feather bg-card/70 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur-xl"
      >
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-0.5"
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300",
                  active ? "bg-accent text-white" : "text-subtle"
                )}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors",
                  active ? "text-accent" : "text-subtle"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}