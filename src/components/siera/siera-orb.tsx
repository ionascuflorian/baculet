"use client";

// Thin shell around Siera's living layer. Keeps the public API (mood, gaze,
// lookAt, reaction, trackCursor) and the short one-off framer gestures; all
// continuous behaviour — eyes, blink, body morph, ambient — lives in
// SieraCharacter and runs on a single rAF loop.

import { useEffect, useRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import type { Point, SieraReaction } from "@/lib/siera/siera-motion";
import { SieraCharacter } from "@/components/siera/siera-character";

export type SieraMood = "idle" | "thinking" | "speaking" | "happy";
export type SieraGaze = "cursor" | "input" | "user";

interface SieraOrbProps {
  className?: string;
  mood?: SieraMood;
  gaze?: SieraGaze;
  ariaHidden?: boolean;
  /**
   * Directed gaze offset (px). When provided it takes priority over mood/gaze
   * math and lets Siera look at a specific element (input, button, …). The
   * values are clamped and spring-smoothed so the eyes never jump or leave the
   * blob.
   */
  lookAt?: Point | null;
  /** One-off micro gesture, short and subtle (squash, nudge, bounce, …). */
  reaction?: SieraReaction | null;
  /**
   * When false, disables the global cursor-proximity lift. Use in contexts
   * where the gaze must be intentional (login, cookie banner) instead of
   * following the cursor.
   */
  trackCursor?: boolean;
  /**
   * User is focusing/typing in the chat input. Siera turns her attention to the
   * interaction: eyes to the input, more attentive blink/gaze.
   */
  attentive?: boolean;
}

export function SieraOrb({
  className = "",
  mood = "idle",
  gaze = "cursor",
  ariaHidden = false,
  lookAt = null,
  reaction = null,
  trackCursor = true,
  attentive = false,
}: SieraOrbProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();

  // Pop subtil, fără bounce, la schimbarea stării.
  const prevMood = useRef(mood);
  useEffect(() => {
    if (prevMood.current === mood) return;
    prevMood.current = mood;
    controls.start({
      scale: [1, 1.025, 1],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  }, [mood, controls]);

  // Micro-gesturi (squash, nudge, bounce, …): scurte, subtile, o singură dată.
  const lastReaction = useRef<SieraReaction | null>(null);
  useEffect(() => {
    if (!reaction || reaction === lastReaction.current) return;
    lastReaction.current = reaction;
    if (reducedMotion) return;
    const gestures: Record<SieraReaction, Parameters<typeof controls.start>[0]> = {
      squash: {
        scaleX: [1, 1.06, 1],
        scaleY: [1, 0.93, 1],
        transition: { duration: 0.28, ease: "easeInOut" },
      },
      nudge: {
        scale: [1, 0.97, 1],
        transition: { duration: 0.24, ease: "easeInOut" },
      },
      bounce: {
        y: [0, -7, 0],
        transition: { duration: 0.42, ease: "easeOut" },
      },
      attention: {
        scale: [1, 1.05, 1],
        transition: { duration: 0.5, ease: "easeInOut" },
      },
      confuse: {
        rotate: [0, -2.5, 2.5, 0],
        transition: { duration: 0.55, ease: "easeInOut" },
      },
      peek: {
        y: [0, 9, 0],
        transition: { duration: 0.45, ease: "easeOut" },
      },
    };
    controls.start(gestures[reaction]);
  }, [reaction, controls, reducedMotion]);

  return (
    <motion.div
      ref={wrapRef}
      animate={controls}
      aria-hidden={ariaHidden || undefined}
      className={`siera-orb-wrap ${className}`}
    >
      <SieraCharacter
        mood={mood}
        gaze={gaze}
        lookAt={lookAt}
        reaction={reaction}
        trackCursor={trackCursor}
        attentive={attentive}
        reduced={!!reducedMotion}
        rootRef={wrapRef}
      />
    </motion.div>
  );
}