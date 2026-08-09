import Link from "next/link";
import { Camera, MessageCircle, Music2, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import { APP_VERSION } from "@/lib/version";

const SOCIAL_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  {
    href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1",
    label: "Discord",
    icon: MessageCircle,
  },
  {
    href: "https://www.instagram.com/ionascuandrey/",
    label: "Instagram",
    icon: Camera,
  },
  {
    href: "https://www.tiktok.com/@ionascuandrey?lang=en",
    label: "TikTok",
    icon: Music2,
  },
];

const PAGE_LINKS = [
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Confidențialitate" },
  { href: "/termeni", label: "Termeni și Condiții" },
  { href: "/feedback", label: "Feedback" },
  { href: "/help", label: "Ajutor" },
];

export function SiteFooter({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <footer className="border-t border-feather/60 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Logo href={homeHref} />

          <nav
            aria-label="Rețele sociale"
            className="flex items-center gap-1.5"
          >
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </nav>

          <nav
            aria-label="Link-uri utile"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-subtle"
          >
            {PAGE_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-6 border-t border-feather/60 pt-6 text-center text-sm text-subtle">
          Baculet · Învață pentru BAC cu ritm, nu cu panică.{" "}
          <span className="text-xs opacity-70">{APP_VERSION}</span>
        </p>
      </div>
    </footer>
  );
}
