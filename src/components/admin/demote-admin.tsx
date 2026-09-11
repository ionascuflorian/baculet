"use client";

import { useTransition } from "react";
import { ShieldX, Loader2 } from "lucide-react";
import { demoteAdmin } from "@/lib/actions/admin";

export function DemoteAdmin({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm("Retrogradezi acest admin la utilizator obișnuit?")) {
          startTransition(async () => {
            try {
              await demoteAdmin(userId);
            } catch (err) {
              window.alert(err instanceof Error ? err.message : "A apărut o eroare.");
            }
          });
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ShieldX className="h-3.5 w-3.5" />
      )}
      {pending ? "…" : "Retrogradează"}
    </button>
  );
}