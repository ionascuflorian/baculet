"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getStoredConsent, storeConsent, type CookieConsent } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { SieraOrb, type SieraMood } from "@/components/siera/siera-orb";
import { lookAtOffset, type Point, type SieraReaction } from "@/lib/siera/siera-motion";

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

  const reducedMotion = useReducedMotion();
  const orbRef = useRef<HTMLDivElement>(null);

  const [mood, setMood] = useState<SieraMood>("idle");
  const [lookAt, setLookAt] = useState<Point | null>({ x: 0, y: 1 });
  const [reaction, setReaction] = useState<SieraReaction | null>(null);

  // Gesturile se resetează singure, ca să poată re-încărca aceeași reacție.
  useEffect(() => {
    if (!reaction) return;
    const t = setTimeout(() => setReaction(null), 650);
    return () => clearTimeout(t);
  }, [reaction]);

  const look = useCallback((el: Element | null) => {
    const orb = orbRef.current;
    if (!el) {
      setLookAt({ x: 0, y: 1 });
      return;
    }
    if (!orb) return;
    setLookAt(
      lookAtOffset(orb.getBoundingClientRect(), el.getBoundingClientRect(), {
        gainX: 0.035,
        gainY: 0.02,
      })
    );
  }, []);

  // La apăsare: un squash scurt, apoi bannerul dispare. Decalajul e mic (150ms)
  // și doar întârzie alegerea — nu schimbă logica de consimțământ.
  const press = useCallback(
    (value: CookieConsent) => {
      if (reducedMotion) {
        choose(value);
        return;
      }
      setMood("idle");
      setReaction("squash");
      window.setTimeout(() => choose(value), 150);
    },
    [choose, reducedMotion]
  );

  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Consimțământ cookie-uri"
      className="animate-fade-in fixed inset-x-0 bottom-0 z-[8800] p-3 sm:p-4"
    >
      <div className="relative mx-auto w-full max-w-3xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-[70px] z-0 flex justify-center sm:-top-[80px]"
        >
          <motion.div
            ref={orbRef}
            initial={{ y: reducedMotion ? 0 : 22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0.25 : 0.5, ease: "easeOut" }}
            className="h-24 w-24 sm:h-28 sm:w-28"
          >
            <SieraOrb
              className="h-full w-full"
              mood={mood}
              lookAt={lookAt}
              reaction={reaction}
              trackCursor={false}
              ariaHidden
            />
          </motion.div>
        </div>
        <div className="relative z-10 mx-auto flex w-full flex-col gap-3 rounded-2xl border-2 border-feather bg-card p-4 shadow-xl sm:flex-row sm:items-center sm:gap-4 sm:p-5">
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
              onMouseEnter={(e) => look(e.currentTarget)}
              onMouseLeave={() => setLookAt({ x: 0, y: 1 })}
              onClick={() => press("rejected")}
            >
              Respinge
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 sm:flex-none"
              onMouseEnter={(e) => look(e.currentTarget)}
              onMouseLeave={() => setLookAt({ x: 0, y: 1 })}
              onClick={() => press("accepted")}
            >
              Acceptă
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}