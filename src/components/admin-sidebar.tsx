"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AdminPermission } from "@/generated/prisma/client";
import {
  LayoutDashboard,
  BookOpen,
  ListChecks,
  GraduationCap,
  Users,
  Palette,
  CalendarDays,
  ArrowLeft,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  permissions: AdminPermission[];
  isOwner: boolean;
}

const links: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: AdminPermission;
}> = [
  { href: "/admin", label: "Prezentare generală", icon: LayoutDashboard },
  { href: "/admin/materii", label: "Materii", icon: BookOpen, permission: "MANAGE_CONTENT" },
  { href: "/admin/teste", label: "Teste", icon: ListChecks, permission: "MANAGE_QUIZZES" },
  { href: "/admin/subiecte", label: "Subiecte BAC", icon: GraduationCap, permission: "MANAGE_EXAMS" },
  { href: "/admin/bac", label: "Calendar BAC", icon: CalendarDays, permission: "MANAGE_SITE_SETTINGS" },
  { href: "/admin/teme", label: "Teme", icon: Palette, permission: "MANAGE_SITE_SETTINGS" },
  { href: "/admin/ai", label: "AI", icon: Sparkles },
  { href: "/admin/ai-content", label: "AI Content Studio", icon: Wand2, permission: "MANAGE_AI_CONTENT" },
  { href: "/admin/utilizatori", label: "Utilizatori", icon: Users, permission: "MANAGE_USERS" },
];

export function AdminSidebar({ permissions, isOwner }: SidebarProps) {
  const pathname = usePathname();

  // Link apăsat: feedback instant că navigarea a început, înainte să se încarce pagina.
  const [pending, setPending] = useState<string | null>(null);

  const canSee = (p?: AdminPermission) =>
    !p || isOwner || permissions.includes(p);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-feather bg-card px-4 py-6">
      <div className="mb-6 px-2">
        <Logo href="/dashboard" />
        <span className="mt-1 block text-xs font-semibold text-subtle">
          Panou admin
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.filter((l) => canSee(l.permission)).map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              onClick={() => setPending(link.href)}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
                active || pending === link.href
                  ? "bg-accent/10 text-accent"
                  : "text-subtle hover:bg-ink/5 hover:text-ink"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {!active && pending === link.href && (
                <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin" />
              )}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/dashboard"
        onClick={() => setPending("/dashboard")}
        className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-semibold text-subtle transition-all active:scale-[0.98] hover:bg-ink/5 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Înapoi la aplicație
        {pathname !== "/dashboard" && pending === "/dashboard" && (
          <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin" />
        )}
      </Link>
    </aside>
  );
}
