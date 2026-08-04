"use client";

import { KeyRound } from "lucide-react";

// Afișat doar cât timp emailul nu e configurat, ca să poți folosi fluxurile.
export function DevCode({ code }: { code: string }) {
  return (
    <p className="animate-pop-in flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
      <KeyRound className="h-4 w-4 shrink-0" />
      <span>
        Mod test — codul tău este{" "}
        <span className="tracking-widest">{code}</span>
      </span>
    </p>
  );
}