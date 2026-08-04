"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteButton({
  action,
  id,
  confirmText = "Sigur vrei să ștergi?",
  label = "Șterge",
}: {
  action: (id: string) => Promise<unknown>;
  id: string;
  confirmText?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) {
          startTransition(async () => {
            await action(id);
          });
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {pending ? "…" : label}
    </button>
  );
}
