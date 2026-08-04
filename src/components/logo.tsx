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
        "flex items-baseline whitespace-nowrap font-extrabold tracking-tight text-ink",
        className
      )}
    >
      <span className="hidden min-[360px]:inline text-lg sm:text-xl">
        Baculet<span className="text-accent">.</span>
      </span>
      <span className="min-[360px]:hidden text-2xl">
        b<span className="text-accent">.</span>
      </span>
    </Link>
  );
}