"use client";

import { useTransition } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { makeAdmin } from "@/lib/actions/admin";

export function PromoteAdmin({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm("Promovezi acest utilizator la Admin?")) {
          startTransition(async () => {
            await makeAdmin(userId);
          });
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-xs font-bold text-accent transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5" />
      )}
      {pending ? "…" : "Promovează admin"}
    </button>
  );
}
