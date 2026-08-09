"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { LayoutDashboard, BookOpen, FileText, TrendingUp, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/materii", label: "Materii", icon: BookOpen },
  { href: "/subiecte-bac", label: "Subiecte", icon: FileText },
  { href: "/prieteni", label: "Prieteni", icon: Users },
  { href: "/clasament", label: "Clasament", icon: Trophy },
  { href: "/progres", label: "Progres", icon: TrendingUp },
];

export function BottomNav() {
  const pathname = usePathname();

  // Pill optimist: la apăsare se mută imediat, înainte să se încarce pagina.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    setPending(null);
  }, [pathname]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(env(safe-area-inset-bottom),0.5rem)] md:hidden">
      <nav
        aria-label="Navigare principală"
        className="mx-auto flex max-w-sm items-center justify-around gap-1 rounded-[2.2rem] border border-feather bg-card/70 px-3 py-2 shadow-lg shadow-black/5 backdrop-blur-xl"
      >
        <LayoutGroup id="bottom-nav">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const pillHere = active || pending === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => setPending(item.href)}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 py-0.5"
            >
              <span className="relative flex h-8 w-12 items-center justify-center rounded-full">
                {pillHere && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "relative z-10 h-5 w-5 transition-colors",
                    active ? "text-white" : "text-subtle"
                  )}
                />
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
        </LayoutGroup>
      </nav>
    </div>
  );
}