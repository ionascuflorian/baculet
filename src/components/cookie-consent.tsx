"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { getStoredConsent, storeConsent, type CookieConsent } from "@/lib/consent";
import { Button } from "@/components/ui/button";

// Cartelă externă minimalistă: bannerul ascunde/arat fresc la fiecare alegere.
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// "pending" = niciun răspuns încă (SSR/hidratare). Bannerul se randează doar
// când clientul confirmă post-hidratare că nu există o alegere salvată —
// astfel nu mai „fulgeră” pe ecranele unde ai ales deja.
type ConsentSnapshot = CookieConsent | null | "pending";

function getServerSnapshot(): ConsentSnapshot {
  return "pending";
}

function getClientSnapshot(): ConsentSnapshot {
  return getStoredConsent();
}

export function CookieConsent() {
  const consent = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const choose = useCallback((value: CookieConsent) => {
    storeConsent(value);
    notifyListeners();
  }, []);

  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Consimțământ cookie-uri"
      className="animate-fade-in fixed inset-x-0 bottom-0 z-[8800] p-3 sm:p-4"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border-2 border-feather bg-card p-4 shadow-xl sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 sm:mt-0">
            <Cookie className="h-4.5 w-4.5 text-accent" />
          </div>
          <p className="text-sm leading-relaxed text-subtle">
            Folosim cookie-uri strict necesare pentru autentificare și funcționarea
            site-ului. Nu folosim cookie-uri de urmărire.{" "}
            <Link
              href="/privacy"
              className="font-bold text-accent underline-offset-4 transition-colors hover:underline"
            >
              Află mai multe
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => choose("rejected")}
          >
            Respinge
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => choose("accepted")}
          >
            Acceptă
          </Button>
        </div>
      </div>
    </div>
  );
}