"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LifeBuoy, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import NextTopLoader from "nextjs-toploader";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { StreakTimer } from "@/components/streak-timer";
import { Siera } from "@/components/siera/siera";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/materii", label: "Materii" },
  { href: "/subiecte-bac", label: "Subiecte BAC" },
  { href: "/progres", label: "Progres" },
];

interface AppShellProps {
  user: {
    name: string;
    email: string;
    role: string;
    image: string | null;
  };
  streakCount: number;
  lastActiveAt: string | null;
  children: React.ReactNode;
}

export function AppShell({
  user,
  streakCount,
  lastActiveAt,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const initial = user.name.charAt(0).toUpperCase();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-feather bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "text-accent"
                        : "text-subtle hover:text-ink"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            <Link
              href="/help"
              title="Ajutor"
              className="flex h-8 w-8 items-center justify-center rounded-full text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <LifeBuoy className="h-5 w-5" />
            </Link>

            <StreakTimer count={streakCount} lastActiveAt={lastActiveAt} variant="nav" />

            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="hidden items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:text-accent sm:flex"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            )}

            <Link
              href="/cont"
              title="Contul meu"
              className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-ink/5"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-bold text-white">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt="Poza de profil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </span>
              <span className="hidden flex-col leading-tight lg:flex">
                <span className="text-xs font-semibold text-ink">
                  {firstName}
                </span>
              </span>
            </Link>

            <form action={logout}>
              <button
                type="submit"
                title="Deconectare"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <NextTopLoader
        color="#0a7cff"
        height={3}
        showSpinner={false}
        shadow={false}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 md:pb-12">
        {children}
      </main>

      <footer className="hidden border-t border-feather py-6 md:block">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-subtle">
          Baculet · Învață pentru BAC cu ritm, nu cu panică.
        </div>
      </footer>

      <BottomNav />
      <Siera />
    </div>
  );
}