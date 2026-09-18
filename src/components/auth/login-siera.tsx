"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SieraOrb, type SieraMood } from "@/components/siera/siera-orb";
import {
  DEFAULT_FORM_GAZE,
  lookAtOffset,
  type Point,
  type SieraReaction,
} from "@/lib/siera/siera-motion";

/**
 * Login scene: Siera on the left (or small above the form on mobile) reacting
 * to the auth form through event delegation on the wrapper — the form itself is
 * untouched. Eyes track the focused input / hovered submit button, with short
 * gestures for typing, press and errors. Siera never captures pointer events,
 * so the form stays fully interactive.
 */
export function LoginSieraScene({ children }: { children: React.ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  const [mood, setMood] = useState<SieraMood>("idle");
  const [lookAt, setLookAt] = useState<Point | null>(DEFAULT_FORM_GAZE);
  const [reaction, setReaction] = useState<SieraReaction | null>(null);

  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const look = useCallback((el: Element | null) => {
    const orb = orbRef.current;
    if (!orb) return;
    if (!el) {
      setLookAt(DEFAULT_FORM_GAZE);
      return;
    }
    setLookAt(
      lookAtOffset(orb.getBoundingClientRect(), el.getBoundingClientRect(), {
        gainX: 0.014,
        gainY: 0.035,
      })
    );
  }, []);

  useEffect(() => {
    const root = sceneRef.current;
    if (!root) return;

    const fieldOf = (el: Element | null) => {
      if (!el || !(el instanceof Element)) return null;
      const hit = el.closest(
        '[id="email"], [id="otp-email"], #password, #code, button[type="submit"], input[type="email"]'
      );
      if (!hit) return null;
      if (hit.closest('button[type="submit"]')) return "button";
      if (hit.id === "email" || hit.id === "otp-email" || hit.id === "password" || hit.id === "code") {
        return hit.id as "email" | "password" | "code";
      }
      return "email";
    };

    const errSel = '[class*="text-danger"]';

    const onFocusIn = (e: FocusEvent) => {
      if (!root.contains(e.target as Node)) return;
      const field = fieldOf(e.target as Element);
      setMood("idle");
      look(field ? (e.target as Element).closest("input") ?? (e.target as Element) : null);
    };

    const onInput = (e: Event) => {
      const target = e.target as Element | null;
      const field = fieldOf(target);
      if (!field || field === "button") return;
      setMood("idle");
      look(target);
      setReaction("attention");
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setReaction(null), 720);
    };

    const onMouseOver = (e: MouseEvent) => {
      const field = fieldOf(e.target as Element);
      if (field === "button") {
        setMood("idle");
        look(e.target as Element);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (fieldOf(e.target as Element) === "button") {
        setMood("idle");
        setReaction("squash");
      }
    };

    const cancelSuccess = () => {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
        successTimer.current = null;
      }
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      setMood("thinking");
      setReaction("attention");
      cancelSuccess();
      successTimer.current = setTimeout(() => {
        if (form && !form.querySelector(errSel)) {
          setMood("happy");
          setReaction("bounce");
        }
      }, 520);
    };

    const mo = new MutationObserver(() => {
      if (root.querySelector(errSel)) {
        cancelSuccess();
        setMood("idle");
        setReaction("confuse");
      }
    });

    const startObserving = () => {
      mo.disconnect();
      const form = root.querySelector("form");
      if (form) mo.observe(form, { childList: true, subtree: true });
    };

    startObserving();
    const moRerun = new MutationObserver(startObserving);
    moRerun.observe(root, { childList: true });

    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("input", onInput);
    root.addEventListener("mouseover", onMouseOver);
    root.addEventListener("mousedown", onMouseDown);
    root.addEventListener("submit", onSubmit, true);

    return () => {
      mo.disconnect();
      moRerun.disconnect();
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("input", onInput);
      root.removeEventListener("mouseover", onMouseOver);
      root.removeEventListener("mousedown", onMouseDown);
      root.removeEventListener("submit", onSubmit, true);
      cancelSuccess();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, [look]);

  // Gesturele se resetează singure, ca să poată re-încărca aceeași reacție.
  useEffect(() => {
    if (!reaction) return;
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setReaction(null), 700);
    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, [reaction]);

  return (
    <div
      ref={sceneRef}
      className="relative grid w-full items-center gap-6 sm:gap-10 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)] lg:gap-4"
    >
      <div
        ref={orbRef}
        className="pointer-events-none mx-auto flex h-24 w-24 items-center justify-center lg:h-[min(26vh,240px)] lg:w-[min(26vh,240px)] lg:justify-self-center"
      >
        <SieraOrb
          className="h-full w-full"
          mood={mood}
          lookAt={lookAt}
          reaction={reaction}
          trackCursor={false}
          ariaHidden
        />
      </div>
      <div className="mx-auto w-full max-w-md justify-self-center lg:justify-self-center">
        {children}
      </div>
    </div>
  );
}