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
        "flex items-center gap-2.5 font-bold tracking-tight text-ink",
        className
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-base font-bold text-white">
        B
      </span>
      <span className="text-xl font-extrabold">Baculet</span>
    </Link>
  );
}