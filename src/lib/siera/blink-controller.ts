// Randomized blink scheduler. Owns WHEN and WHICH blink happens and how each
// eye closes. The orchestration layer only consumes the resulting openness.
//
// Living-character rules implemented here:
//   - irregular intervals (2.6–7.8 s), never a fixed rhythm
//   - several blink variants with weighted probability
//   - fast close / slow open (natural profile) with an ease-out reopen
//   - right eye lags the left by a random 20–60 ms (asymmetry)
//   - external requests (surprise, attention) with a cooldown
//   - `prefers-reduced-motion`: rare, single, slower discrete blinks

import {
  pickWeighted,
  randRange,
  type BlinkType,
  type CharacterInputs,
  type SieraEmotion,
} from "@/lib/siera/character-state";

interface BlinkPulse {
  /** Start time in accumulated seconds. */
  start: number;
  closeDur: number;
  openDur: number;
  /** How fully the eye closes (1 = fully shut, <1 = droopy). */
  occlude: number;
  /** Right-eye lag, seconds. */
  lagR: number;
}

const TYPES: Record<
  BlinkType,
  { close: number; open: number; occlude: number; count: number; gap?: number }
> = {
  normal: { close: 0.085, open: 0.17, occlude: 0.92, count: 1 },
  quick: { close: 0.055, open: 0.1, occlude: 0.8, count: 1 },
  double: { close: 0.06, open: 0.09, occlude: 0.88, count: 2, gap: 0.11 },
  long: { close: 0.12, open: 0.28, occlude: 0.97, count: 1 },
  sleepy: { close: 0.18, open: 0.5, occlude: 0.62, count: 1 },
};

const WEIGHTS: ReadonlyArray<readonly [BlinkType, number]> = [
  ["normal", 0.7],
  ["quick", 0.1],
  ["double", 0.08],
  ["long", 0.06],
  ["sleepy", 0.06],
];

/** Seconds until the next natural blink, per emotion. */
function intervalFor(emotion: SieraEmotion, reduced: boolean): number {
  if (reduced) return randRange(6, 12);
  const base = randRange(2.6, 7.8);
  switch (emotion) {
    case "thinking":
      return base * 0.7;
    case "excited":
    case "playful":
      return base * 0.85;
    case "sleepy":
      return base * 1.5;
    case "surprised":
      return base * 0.6;
    default:
      return base;
  }
}

/** 0..1: how open a single pulse keeps the eye at a given elapsed time. */
function opennessAt(maxT: number, pulse: BlinkPulse): number {
  if (maxT < 0) return 1;
  if (maxT < pulse.closeDur) {
    const u = Math.min(1, maxT / pulse.closeDur);
    return 1 - pulse.occlude * u * u;
  }
  const u = Math.min(1, Math.max(0, maxT - pulse.closeDur) / pulse.openDur);
  const eased = 1 - (1 - u) * (1 - u);
  return 1 - pulse.occlude * (1 - eased);
}

function blinkParams(type: BlinkType): { close: number; open: number; occlude: number; count: number; gap?: number } {
  return TYPES[type];
}

export class BlinkController {
  private time = 0;
  private nextAt = randRange(2.6, 7.8);
  private pulses: BlinkPulse[] = [];
  private lastPulseStart = -10;

  reset(): void {
    this.time = 0;
    this.nextAt = randRange(2.6, 7.8);
    this.pulses = [];
    this.lastPulseStart = -10;
  }

  /** Queue an emergency blink (surprise, direct interaction). */
  request(type: BlinkType, delay = 0): void {
    if (this.time - this.lastPulseStart < 0.45) return;
    this.schedule(type, delay);
  }

  private schedule(type: BlinkType, delay: number): void {
    const p = blinkParams(type);
    const start = this.time + delay;
    for (let i = 0; i < p.count; i++) {
      const at = start + (p.gap ?? 0) * i;
      this.pulses.push({
        start: at,
        closeDur: p.close,
        openDur: p.open,
        occlude: p.occlude,
        lagR: randRange(0.02, 0.06),
      });
    }
    this.lastPulseStart = start;
  }

  private naturalBlink(emotion: SieraEmotion): BlinkType {
    let weights: ReadonlyArray<readonly [BlinkType, number]> = WEIGHTS;
    if (emotion === "sleepy") {
      weights = [
        ["normal", 0.35],
        ["long", 0.3],
        ["sleepy", 0.25],
        ["quick", 0.1],
      ];
    }
    return pickWeighted(weights);
  }

  /**
   * Advance by dt seconds and return per-eye openness 0..1.
   * `emotion` influences interval and blink flavour; `inputs.reduced` drives
   * the near-frozen (rare, discrete) mode.
   */
  update(dt: number, inputs: CharacterInputs, emotion: SieraEmotion): { openL: number; openR: number } {
    this.time += dt;

    if (this.time >= this.nextAt) {
      this.schedule(this.naturalBlink(emotion), 0);
      this.nextAt = this.time + intervalFor(emotion, inputs.reduced);
    }

    const cutoff = this.time - 0.6;
    this.pulses = this.pulses.filter((p) => p.start + p.closeDur + p.openDur > cutoff);

    let openL = 1;
    let openR = 1;
    for (const pulse of this.pulses) {
      const tL = this.time - pulse.start;
      const tR = tL - pulse.lagR;
      openL = Math.min(openL, opennessAt(tL, pulse));
      openR = Math.min(openR, opennessAt(tR, pulse));
    }
    return { openL, openR };
  }
}