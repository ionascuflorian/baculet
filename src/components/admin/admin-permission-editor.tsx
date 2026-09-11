"use client";

import { useState, useTransition } from "react";
import { Settings2, Loader2, X } from "lucide-react";
import { updateAdminPermissions } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import type { AdminPermission } from "@/generated/prisma/client";

const PERMISSION_OPTIONS: Array<{ value: AdminPermission; label: string; hint: string }> = [
  { value: "MANAGE_CONTENT", label: "Materii, capitole, lecții", hint: "Editează materialul educațional." },
  { value: "MANAGE_QUIZZES", label: "Teste grilă", hint: "Creează și editează teste și întrebări." },
  { value: "MANAGE_EXAMS", label: "Subiecte BAC", hint: "Gestionează subiectele oficiale." },
  { value: "MANAGE_SITE_SETTINGS", label: "Calendar BAC + Teme", hint: "Setări globale ale site-ului." },
  { value: "MANAGE_SITE_AI", label: "Cheia AI a site-ului", hint: "Siera și generatorul de teme folosesc această cheie globală." },
  { value: "MANAGE_AI_CONTENT", label: "AI Content Studio", hint: "Proiectele și generarea de conținut AI." },
  { value: "MANAGE_USERS", label: "Utilizatori", hint: "Acces la lista de conturi." },
];

export function AdminPermissionEditor({
  userId,
  userName,
  currentPermissions,
  isOwner,
}: {
  userId: string;
  userName: string;
  currentPermissions: AdminPermission[];
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermission[]>(currentPermissions);
  const [owner, setOwner] = useState(isOwner);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = (value: AdminPermission) => {
    setPermissions((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const run = () => {
    setError("");
    startTransition(async () => {
      try {
        await updateAdminPermissions(userId, { permissions, isOwner: owner });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "A apărut o eroare.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPermissions(currentPermissions);
          setOwner(isOwner);
          setError("");
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-ink/5 px-3 py-2 text-xs font-bold text-ink transition-opacity hover:opacity-80"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Permisiuni
      </button>

      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-pop-in w-full max-w-lg rounded-3xl border-2 border-feather bg-card p-6 shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink">Permisiuni admin</h3>
                <p className="mt-1 text-sm font-semibold text-subtle">{userName}</p>
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

            <div className="space-y-2">
              {PERMISSION_OPTIONS.map((opt) => {
                const checked = permissions.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm font-semibold transition-colors ${
                      checked
                        ? "border-accent/40 bg-accent/5 text-ink"
                        : "border-feather bg-transparent text-subtle"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.value)}
                      disabled={pending}
                      className="mt-0.5 h-4 w-4 accent-accent"
                    />
                    <span>
                      {opt.label}
                      <span className="block text-xs font-medium text-subtle">
                        {opt.hint}
                      </span>
                    </span>
                  </label>
                );
              })}

              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm font-semibold transition-colors ${
                owner ? "border-warning/50 bg-warning/5 text-ink" : "border-feather text-subtle"
              }`}>
                <input
                  type="checkbox"
                  checked={owner}
                  onChange={(e) => setOwner(e.target.checked)}
                  disabled={pending}
                  className="mt-0.5 h-4 w-4 accent-warning"
                />
                <span>
                  Owner
                  <span className="block text-xs font-medium text-subtle">
                    Toate permisiunile, nu poate fi demovat. Ultimul owner nu poate fi
                    dezactivat.
                  </span>
                </span>
              </label>
            </div>

            {error && (
              <p className="mt-4 animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Anulează
              </Button>
              <Button type="button" className="flex-1" disabled={pending} onClick={run}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
                {pending ? " Se salvează…" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}