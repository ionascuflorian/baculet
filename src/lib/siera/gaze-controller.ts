// Per-eye gaze composition. Each eye moves on its own spring, so the right eye
// lags the left and the pair reads as one gaze that is alive instead of rigid.
//
// Goal per frame = cursor influence + idle drift + emotional offset + micro
// noise. Springs are different per eye (left faster, right softer), which keeps
// the lag organic. Everything is clamped so the eyes never leave the blob.

import {
  BoundedWalker,
  clamp,
  randRange,
  smoothTo,
  spring,
  type CharacterInputs,
  type Point2D,
  type SieraEmotion,
} from "@/lib/siera/character-state";

export interface GazeUpdate {
  /** Per-eye gaze offsets in SVG user units. */
  left: Point2D;
  right: Point2D;
}

/** Max excursion — eyes stay inside the 64×32 blob. */
const LIMIT_X = 6.2;
const LIMIT_Y = 4.2;

/** How strongly the cursor pulls the eyes (px at full proximity). */
const CURSOR_X = 5.0;
const CURSOR_Y = 4.0;

interface EyeRig {
  x: { v: number; vel: number };
  y: { v: number; vel: number };
  stiffness: number;
  damping: number;
  drift: { x: BoundedWalker; y: BoundedWalker };
  micro: { x: BoundedWalker; y: BoundedWalker };
  goalFilterX: number;
  goalFilterY: number;
}

function makeRig(stiffness: number, damping: number): EyeRig {
  return {
    x: { v: 0, vel: 0 },
    y: { v: 0, vel: 0 },
    stiffness,
    damping,
    drift: {
      x: new BoundedWalker(0, 1.4, 0.9),
      y: new BoundedWalker(0, 0.8, 1.1),
    },
    micro: {
      x: new BoundedWalker(0, 0.22, 4.5),
      y: new BoundedWalker(0, 0.16, 5.0),
    },
    goalFilterX: 0,
    goalFilterY: 0,
  };
}

/** Per-emotion gaze bias, in SVG units — eyes look the way the feeling points. */
const EMOTION_BIAS: Record<SieraEmotion, Point2D> = {
  idle: { x: 0, y: 0 },
  curious: { x: 2.4, y: 0.6 },
  happy: { x: -1.2, y: -1.6 },
  excited: { x: 1.4, y: -1 },
  thinking: { x: 0.3, y: -2.8 },
  confused: { x: -1.6, y: 1.2 },
  surprised: { x: 0, y: 0.4 },
  listening: { x: 0.4, y: 3.4 },
  sleepy: { x: 0, y: 2.2 },
  playful: { x: 2, y: -0.6 },
  concerned: { x: -1.2, y: 1.4 },
};

export class GazeController {
  private left = makeRig(320, 26);
  private right = makeRig(180, 20);

  reset(): void {
    this.left = makeRig(320, 26);
    this.right = makeRig(180, 20);
  }

  /**
   * Advance the gaze. `viewOffset` is the directed offset (from lookAt mood
   * math etc.) when present, otherwise null.
   */
  update(
    dt: number,
    inputs: CharacterInputs,
    emotion: SieraEmotion,
    viewOffset: Point2D | null,
    idleBias: Point2D
  ): GazeUpdate {
    const emotionBias = EMOTION_BIAS[emotion];

    // Cursor pull: strongest when the cursor moves near the orb.
    let cursorX = 0;
    let cursorY = 0;
    if (inputs.trackCursor && inputs.gaze === "cursor" && !viewOffset) {
      cursorX = inputs.cursorDir.x * CURSOR_X * inputs.near;
      cursorY = inputs.cursorDir.y * CURSOR_Y * inputs.near;
    }

    const biasX = viewOffset?.x ?? emotionBias.x + idleBias.x;
    const biasY = viewOffset?.y ?? emotionBias.y + idleBias.y;

    const targetX = clamp(cursorX + biasX, -LIMIT_X, LIMIT_X);
    const targetY = clamp(cursorY + biasY, -LIMIT_Y, LIMIT_Y);

    // Shared goal then per-eye drift/micro. Right eye additionally filters the
    // goal so it trails slightly — the lag is part of the life.
    for (const [rig, isRight] of [
      [this.left, false],
      [this.right, true],
    ] as const) {
      const gx = clamp(
        targetX + rig.drift.x.step(dt) + rig.micro.x.step(dt),
        -LIMIT_X,
        LIMIT_X
      );
      const gy = clamp(
        targetY + rig.drift.y.step(dt) + rig.micro.y.step(dt),
        -LIMIT_Y,
        LIMIT_Y
      );

      if (isRight) {
        rig.goalFilterX = smoothTo(rig.goalFilterX, gx, dt, 0.07);
        rig.goalFilterY = smoothTo(rig.goalFilterY, gy, dt, 0.07);
      }

      const goalX = isRight ? rig.goalFilterX : gx;
      const goalY = isRight ? rig.goalFilterY : gy;

      const nx = spring(rig.x.v, rig.x.vel, goalX, dt, rig.stiffness, rig.damping);
      const ny = spring(rig.y.v, rig.y.vel, goalY, dt, rig.stiffness, rig.damping);
      rig.x = nx;
      rig.y = ny;
    }

    return {
      left: { x: this.left.x.v, y: this.left.y.v },
      right: { x: this.right.x.v, y: this.right.y.v },
    };
  }
}

/** One-off look-shift for a micro-reaction (peek, glance aside). */
export function randomLook(reduced: boolean): Point2D {
  if (reduced) return { x: 0, y: 0 };
  return {
    x: randRange(-2.2, 2.2),
    y: randRange(-1.8, 1.8),
  };
}