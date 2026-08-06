"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, X } from "lucide-react";
import { ProfilePicker } from "@/components/profile/profile-picker";
import type { ProfileId } from "@/lib/profile";

export function ProfileOnboarding({
  open,
  dismissible = false,
  onClose,
}: {
  open: boolean;
  dismissible?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ProfileId | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const save = async (id: ProfileId) => {
    if (pending) return;
    setSelected(id);
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "A apărut o eroare.");
      } else {
        router.refresh();
        onClose?.();
      }
    } catch {
      setError("A apărut o eroare.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Alege profilul de studiu"
      className="animate-fade-in fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 p-4"
      onClick={() => dismissible && !pending && onClose?.()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in w-full max-w-lg rounded-3xl border-2 border-feather bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-ink">
                Ce profil de studiu ești?
              </h3>
              <p className="mt-0.5 text-sm text-subtle">
                Vom scoate în prim-plan materiile relevante pentru profilul tău
                de bacalaureat.
              </p>
            </div>
          </div>
          {dismissible && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onClose?.()}
              className="rounded-lg p-1 text-subtle transition-colors hover:bg-feather/60 hover:text-ink disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <ProfilePicker value={selected} onChange={save} disabled={pending} />

        {error && (
          <p className="mt-4 animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
