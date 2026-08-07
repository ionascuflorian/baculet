"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, X } from "lucide-react";
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
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    return () => window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    setClosing(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (closing || pending) return;
    setClosing(true);
    timerRef.current = window.setTimeout(() => onClose?.(), 200);
  }, [closing, pending, onClose]);

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
        if (onClose) {
          setClosing(true);
          timerRef.current = window.setTimeout(onClose, 200);
        }
      }
    } catch {
      setError("A apărut o eroare.");
    } finally {
      setPending(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Alege profilul de studiu"
      className={`fixed inset-0 z-[9000] flex items-center justify-center p-4 ${
        closing ? "pointer-events-none" : ""
      }`}
      onClick={() => dismissible && requestClose()}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: closing ? 0.16 : 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={
          closing
            ? { opacity: 0, scale: 0.95, y: 10 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          closing
            ? { duration: 0.16, ease: "easeIn" }
            : { type: "spring", stiffness: 380, damping: 28 }
        }
        className="relative w-full max-w-lg rounded-3xl border-2 border-feather bg-card p-6 shadow-lg"
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
              {pending ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-accent">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Se salvează
                  profilul…
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-subtle">
                  Vom scoate în prim-plan materiile relevante pentru profilul
                  tău de bacalaureat.
                </p>
              )}
            </div>
          </div>
          {dismissible && (
            <button
              type="button"
              disabled={pending}
              onClick={requestClose}
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
      </motion.div>
    </div>,
    document.body
  );
}
