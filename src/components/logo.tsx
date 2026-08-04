import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className, href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-baseline font-extrabold tracking-tight",
        className
      )}
    >
      <span className="hidden text-xl text-ink sm:inline">
        Baculet<span className="text-accent">.</span>
      </span>
      <span className="text-2xl text-ink sm:hidden">
        b<span className="text-accent">.</span>
      </span>
    </Link>
  );
}