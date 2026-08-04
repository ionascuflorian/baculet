"use client";

import { useState } from "react";
import { useTransition } from "react";
import { Trash2, Loader2, X, AlertTriangle } from "lucide-react";
import { deleteUser } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function DeleteUser({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError("");
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (!result.ok) {
        setError(result.error ?? "A apărut o eroare.");
      } else {
        setOpen(false);
        setChecked(false);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setChecked(false);
          setError("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger transition-opacity hover:opacity-80"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Șterge
      </button>

      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-pop-in w-full max-w-md rounded-3xl border-2 border-feather bg-card p-6 shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-extrabold text-ink">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                  Ștergi contul definitiv
                </h3>
                <p className="mt-1 text-sm text-subtle">
                  <span className="font-bold text-ink">{name}</span> · {email}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-subtle transition-colors hover:bg-feather/60 hover:text-ink disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-subtle">
              Contul, progresul lecțiilor, punctele și toate datele asociate se
              șterg definitiv. Această acțiune nu poate fi anulată.
            </p>

            <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl bg-feather/50 p-3 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                disabled={pending}
                className="mt-0.5 h-4 w-4 accent-red-500"
              />
              Înțeleg că această acțiune este permanentă și nu poate fi anulată.
            </label>

            {error && (
              <p className="mb-4 animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Anulează
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                disabled={!checked || pending}
                onClick={run}
              >
                {pending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
                {pending ? "Se șterge…" : "Șterge contul"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}