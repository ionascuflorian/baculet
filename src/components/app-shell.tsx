"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import NextTopLoader from "nextjs-toploader";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav } from "@/components/bottom-nav";
import { StreakTimer } from "@/components/streak-timer";
import { SiteFooter } from "@/components/site-footer";
import { ProfileMenu } from "@/components/profile-menu";
import { MoreMenu } from "@/components/more-menu";
import { NotificationsBootstrap } from "@/components/push/notifications-bootstrap";

// Siera (chat AI + markdown) se încarcă la cerere, separat de JS-ul inițial.
const Siera = dynamic(
  () => import("@/components/siera/siera").then((m) => m.Siera),
  { ssr: false }
);

const primaryNav = [
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
    username: string | null;
    image: string | null;
  };
  streakCount: number;
  lastActiveAt: string | null;
  children: React.ReactNode;
}

function NavLink({
  href,
  label,
  layoutId,
  pathname,
  pending,
  onPending,
}: {
  href: string;
  label: string;
  layoutId: string;
  pathname: string;
  pending: string | null;
  onPending: (href: string) => void;
}) {
  const active = pathname === href || pathname.startsWith(href + "/");
  const pillHere = active || pending === href;

  return (
    <Link
      href={href}
      prefetch
      onClick={() => onPending(href)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 md:px-3 lg:px-3.5",
        active ? "text-accent" : "text-subtle hover:text-ink"
      )}
    >
      {pillHere && (
        <motion.span
          layoutId={layoutId}
          className={cn(
            "absolute inset-0 rounded-full",
            active || pending === href ? "bg-accent/10" : "bg-transparent"
          )}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10 whitespace-nowrap leading-none">{label}</span>
    </Link>
  );
}

export function AppShell({
  user,
  streakCount,
  lastActiveAt,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  // Pill optimist: la apăsare se mută imediat, înainte să se încarce pagina.
  // Resetăm la navigare încheiată prin ajustare de stare în timpul render-ului
  // (pattern recomandat — fără setState direct în efecte).
  const [pending, setPending] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState(pathname);

  if (lastPath !== pathname) {
    setLastPath(pathname);
    setPending(null);
  }

  return (
    <div className="app-shell flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:ring-2 focus:ring-accent"
      >
        Sari la conținut
      </a>
      <header className="sticky top-0 z-40 border-b border-feather bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl flex-nowrap items-center justify-between gap-3 px-4 md:h-[72px] md:gap-4 md:px-6 lg:gap-5 lg:px-9 xl:gap-6">
          <div className="flex min-w-0 flex-nowrap items-center gap-3 md:gap-4 lg:gap-5 xl:gap-8">
            <Logo
              href="/dashboard"
              className="shrink-0 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />

            <LayoutGroup id="header-nav-primary">
              <nav
                aria-label="Navigare principală"
                className="hidden flex-nowrap items-center gap-1 md:flex md:gap-1.5 lg:gap-2"
              >
                {primaryNav.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    layoutId="nav-pill-primary"
                    pathname={pathname}
                    pending={pending}
                    onPending={setPending}
                  />
                ))}
              </nav>
            </LayoutGroup>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center gap-1.5 md:gap-2 lg:gap-3 xl:gap-4">
            {/* Secundarele (Recapitulare, Prieteni, Clasament) stau în „Mai mult" de la tabletă. */}
            <div className="hidden md:block">
              <MoreMenu />
            </div>

            <div className="md:hidden lg:block">
              <StreakTimer count={streakCount} lastActiveAt={lastActiveAt} variant="nav" />
            </div>

            <ThemeToggle compactBelow="lg" />

            <ProfileMenu user={user} />
          </div>
        </div>
      </header>

      <NextTopLoader
        color="var(--accent)"
        height={3}
        showSpinner={false}
        shadow={false}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 scroll-mt-24 px-4 pb-32 pt-6 md:pb-12"
      >
        {children}
      </main>

      <footer className="hidden border-t border-feather md:block">
        <SiteFooter homeHref="/dashboard" />
      </footer>

      <BottomNav />
      <Siera />
      <NotificationsBootstrap />
    </div>
  );
}