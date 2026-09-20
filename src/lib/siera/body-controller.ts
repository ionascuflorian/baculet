// Organic body motion: the blob never stops morphing. Border-radius values
// wander on a bounded random walk and get smoothly interpolated, a couple of
// superposed sine layers drive breathing, and emotions change the rhythm and
// amplitude. Reaction energy adds short physical impulses (a bounce, a pop).

import {
  clamp,
  randRange,
  smoothTo,
  type SieraEmotion,
} from "@/lib/siera/character-state";

/** Current 8-value border-radius: 4 horizontal + 4 vertical. */
type Radius = [number, number, number, number, number, number, number, number];

const BASE: Radius = [46, 54, 58, 42, 42, 46, 54, 58];
const MIN_R = 32;
const MAX_R = 64;

const EMOTION_BODY: Record<
  SieraEmotion,
  { breathe: number; warp: number; bob: number }
> = {
  idle: { breathe: 0.012, warp: 5, bob: 1.1 },
  curious: { breathe: 0.014, warp: 6, bob: 1.6 },
  happy: { breathe: 0.02, warp: 9, bob: 2.2 },
  excited: { breathe: 0.024, warp: 10, bob: 2.8 },
  thinking: { breathe: 0.011, warp: 4, bob: 0.8 },
  confused: { breathe: 0.013, warp: 8, bob: 1.2 },
  surprised: { breathe: 0.02, warp: 12, bob: 2.4 },
  listening: { breathe: 0.013, warp: 5, bob: 1.2 },
  sleepy: { breathe: 0.008, warp: 2, bob: 0.5 },
  playful: { breathe: 0.022, warp: 9, bob: 2 },
  concerned: { breathe: 0.012, warp: 4, bob: 0.9 },
};

export interface BodyOutput {
  borderRadius: string;
  scaleX: number;
  scaleY: number;
  ty: number;
  rotate: number;
  /** 0..1 drift amount — how much flavor the body has right now. */
}

export class BodyController {
  private cur: Radius = [...BASE];
  private next: Radius = [...BASE];
  private moveIn = randRange(0.9, 1.6);
  private phaseA = randRange(0, Math.PI * 2);
  private phaseB = randRange(0, Math.PI * 2);
  private phaseC = randRange(0, Math.PI * 2);
  private impulse = 0; // 0..1 decaying reaction energy
  private lastEmotion: SieraEmotion = "idle";

  reset(): void {
    this.cur = [...BASE];
    this.next = [...BASE];
    this.impulse = 0;
  }

  /** Trigger a short physical impulse (used on a new reaction). */
  bump(): void {
    this.impulse = 1;
  }

  update(dt: number, emotion: SieraEmotion): BodyOutput {
    this.moveIn -= dt;
    if (this.moveIn <= 0) {
      this.moveIn = randRange(0.9, 1.6);
      const prev = [...this.next];
      this.next = prev.map((v) =>
        clamp(v + randRange(-9, 9), MIN_R, MAX_R)
      ) as Radius;
      this.cur = this.cur.map((v, idx) => v + (prev[idx] - v) * 0.15) as Radius;
    }

    this.cur = this.cur.map((v, idx) =>
      smoothTo(v, this.next[idx], dt, 1.1)
    ) as Radius;

    if (emotion !== this.lastEmotion) {
      this.lastEmotion = emotion;
      this.moveIn = Math.min(this.moveIn, 0.2);
    }

    const body = EMOTION_BODY[emotion];
    const t = performance.now() / 1000 * 1; // wall clock seconds for rhythm
    this.phaseA += dt * (0.55 + body.warp * 0.02);
    this.phaseB += dt * (1.1 + body.warp * 0.015);
    this.phaseC += dt * 0.35;

    this.impulse = smoothTo(this.impulse, 0, dt, 0.5);

    // Breathing = two slow sines; the warp charg waves the radius more in lively moods.
    const breatheA = Math.sin(t * 1.15 + this.phaseA);
    const breatheB = Math.sin(t * 2.3 + this.phaseB) * 0.45;
    const breathe = breatheA + breatheB;

    const scaleX = 1 + breathe * body.breathe * 3 + this.impulse * 0.035;
    const scaleY = 1 - breathe * body.breathe * 2.6 - this.impulse * 0.03;

    const ty =
      Math.sin(t * 1.4 + this.phaseC) * body.bob * 0.55 +
      this.impulse * -2.5;
    const rotate = Math.sin(t * 0.8 + this.phaseA) * (1.1 + body.warp * 0.06);

    const borderRadius = `${this.cur[0]}% ${this.cur[1]}% ${this.cur[2]}% ${this.cur[3]}% / ${this.cur[4]}% ${this.cur[5]}% ${this.cur[6]}% ${this.cur[7]}%`;

    return { borderRadius, scaleX, scaleY, ty, rotate };
  }
}