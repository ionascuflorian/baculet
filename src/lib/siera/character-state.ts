// Shared types and math for Siera's living-character layer.
//
// The visual layer (SieraCharacter) is behaviour-driven: BehaviorController
// decides WHAT Siera does, the sub-controllers decide HOW she performs it.
// Controllers mutate a plain `CharacterFrame`; the orchestrator flushes it to
// the DOM once per animation frame. No React state is touched during the loop.

import type { SieraMood, SieraGaze } from "@/components/siera/siera-orb";
import type { SieraReaction } from "@/lib/siera/siera-motion";

export type { SieraMood, SieraGaze, SieraReaction };

/** Emotional states — modifiers over one shared animation system, not scripts. */
export type SieraEmotion =
  | "idle"
  | "curious"
  | "happy"
  | "excited"
  | "thinking"
  | "confused"
  | "surprised"
  | "listening"
  | "sleepy"
  | "playful"
  | "concerned";

/** Idle micro-states the behaviour FSM cycles through with probability. */
export type IdleMicroState = "neutral" | "glance" | "curious" | "relax" | "micro";

/** Supported blink variants, picked by weighted randomness. */
export type BlinkType = "normal" | "quick" | "double" | "long" | "sleepy";

export interface Point2D {
  x: number;
  y: number;
}

/** Everything the behavioural layer needs to decide Siera's intent. */
export interface CharacterInputs {
  mood: SieraMood;
  gaze: SieraGaze;
  lookAt: Point2D | null;
  reaction: SieraReaction | null;
  trackCursor: boolean;
  /** User is focusing/typing in the chat input. */
  attentive: boolean;
  /** prefers-reduced-motion: nearly frozen, rare discrete blink only. */
  reduced: boolean;
  /** Cursor proximity 0..1 (0 = far, 1 = touching the orb). */
  near: number;
  /** Normalized direction from orb centre toward the cursor. */
  cursorDir: Point2D;
}

/** Behaviour output — WHAT Siera wants to do right now. */
export interface BehaviorOutput {
  emotion: SieraEmotion;
  /** Gaze bias coming from the idle micro-state (look away, glance …). */
  idleGazeBias: Point2D;
  /** 0..1 attention energy: how strongly eyes should track the cursor. */
  attention: number;
  /** True while a discrete body impulse should play (surprise, bounce …). */
  bodyImpulse: "expand" | "squash" | "shear" | null;
  /** Optional forced blink request in the current or next frame. */
  blinkRequest: BlinkType | null;
}

/** Per-eye shape contribution. */
export interface EyeShape {
  /** 0..1 openness (1 = fully open). Blink + squint live here. */
  open: number;
  /** 0..1 morph toward the happy/smile arc. */
  smile: number;
  /** Squint 0..1 — narrows the eye without closing it fully. */
  squint: number;
  /** Tilt in degrees (curious / playful tilt). */
  tilt: number;
}

export interface GazeState {
  x: number;
  y: number;
}

/** The full per-frame target set controllers write into. */
export interface CharacterFrame {
  leftEye: EyeShape & { gaze: GazeState };
  rightEye: EyeShape & { gaze: GazeState };
  /** 0.98..1.02 subtle inter-eye spacing drift. */
  spacing: number;
  /** CSS border-radius shorthand for the blob. */
  borderRadius: string;
  /** Breathing/impulse body scale. */
  bodyScale: { x: number; y: number };
  /** Levitate offset in px. */
  bodyTy: number;
  /** Subtle blob rotation in degrees. */
  bodyRotate: number;
  fog: { opacity: number; scale: number };
  halo: number;
  energyRotate: number;
}

// ---------- math helpers ----------

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const randRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/** Low-pass toward `target` so a value eases smoothly across frames. */
export const smoothTo = (
  cur: number,
  target: number,
  dt: number,
  /** Time constant in seconds — higher = slower. */
  tc: number
): number => {
  const k = 1 - Math.exp(-dt / Math.max(0.001, tc));
  return cur + (target - cur) * k;
};

/** Exact bound: k * (v - target). */
export const spring = (
  v: number,
  vel: number,
  target: number,
  dt: number,
  stiffness: number,
  damping: number
): { v: number; vel: number } => {
  dt = Math.min(dt, 0.05);
  const a = -stiffness * (v - target) - damping * vel;
  const nv = vel + a * dt;
  const n = v + nv * dt;
  return { v: n, vel: nv };
};

/** Weighted pick from `[value, weight]` pairs. */
export function pickWeighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = Math.random() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Mean-reverting bounded random walk — organic drift, never chaotic. */
export class BoundedWalker {
  private v = 0;
  private target = 0;
  private tNext = 0;

  constructor(
    private readonly center: number,
    private readonly amp: number,
    private readonly rate: number
  ) {
    this.v = center;
    this.target = center;
    this.tNext = randRange(0.4, 1.2);
  }

  /** Advance by dt seconds; returns the current value. */
  step(dt: number): number {
    this.tNext -= dt;
    if (this.tNext <= 0) {
      this.tNext = randRange(0.6, 1.6) / this.rate;
      this.target = clamp(
        this.center + randRange(-this.amp, this.amp),
        this.center - this.amp * 2,
        this.center + this.amp * 2
      );
    }
    this.v = smoothTo(this.v, this.target, dt, 0.9);
    return this.v;
  }

  reset(): void {
    this.v = this.center;
    this.target = this.center;
  }
}

/** Pure functional random walk for ambient values. Returns a step function. */
export function vendBoundedWalker(
  center: number,
  amp: number,
  rate: number
): { next: () => number; reset: () => void } {
  let v = center;
  let target = center;
  let tNext = randRange(0.4, 1);

  return {
    next: () => {
      tNext -= 1 / 60;
      if (tNext <= 0) {
        tNext = randRange(0.6, 1.6) / rate;
        target = center + randRange(-amp, amp);
      }
      const dt = 1 / 60;
      v = smoothTo(v, target, dt, 1.2);
      return v;
    },
    reset: () => {
      v = center;
      target = center;
    },
  };
}