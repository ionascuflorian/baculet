"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, ShieldCheck, LifeBuoy, User, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";

interface ProfileMenuItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  className?: string;
}

function ProfileMenuItem({ href, icon: Icon, label, onClick, className }: ProfileMenuItemProps) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-subtle transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

interface ProfileMenuProps {
  user: {
    name: string;
    email: string;
    role: string;
    username: string | null;
    image: string | null;
  };
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initials = user.name.charAt(0).toUpperCase();
  const firstName = user.name.split(" ")[0];
  const profileHref = user.username ? `/u/${user.username}` : "/cont";

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
        aria-label="Contul meu și meniu"
        className="flex items-center gap-1 rounded-full p-1 transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-bold text-white">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt="Poza de profil"
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="hidden items-center gap-1 text-sm font-semibold text-ink lg:flex">
          {firstName}
          {user.role === "ADMIN" && (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Admin" />
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-subtle transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Meniu cont"
          className="animate-pop-in absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border-2 border-feather bg-card p-1.5 shadow-xl"
        >
          <div className="border-b border-feather/70 px-3 py-2.5">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <p className="truncate text-xs text-subtle">{user.email}</p>
          </div>
          <div className="pt-1.5">
            <ProfileMenuItem
              href={profileHref}
              icon={User}
              label="Contul meu"
              onClick={() => setOpen(false)}
            />
            <ProfileMenuItem
              href="/recapitulare"
              icon={Repeat}
              label="Recapitulare"
              onClick={() => setOpen(false)}
              className="md:hidden"
            />
            <ProfileMenuItem
              href="/help"
              icon={LifeBuoy}
              label="Ajutor"
              onClick={() => setOpen(false)}
            />
            {user.role === "ADMIN" && (
              <ProfileMenuItem
                href="/admin"
                icon={ShieldCheck}
                label="Panou admin"
                onClick={() => setOpen(false)}
              />
            )}
            <form action={logout} className="mt-1.5 border-t border-feather/70 pt-1.5">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-danger transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <LogOut className="h-4 w-4" />
                Deconectare
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}