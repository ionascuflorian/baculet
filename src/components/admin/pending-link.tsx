"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Link cu feedback de navigare: la apăsare apare un spinner până se încarcă ruta. */
export function PendingLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setPending(false);
  }, [pathname]);

  return (
    <Link
      href={href}
      prefetch
      onClick={() => setPending(true)}
      className={className}
    >
      {children}
      {pending && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
    </Link>
  );
}
