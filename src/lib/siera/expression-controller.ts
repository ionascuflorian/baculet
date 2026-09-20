// Emotion → eye expression. Emotion is a whole-system modifier; this controller
// only reads the resolved emotion and smoothly re-shapes the eyes towards the
// matching expression. Transitions are eased, never cut.

import {
  smoothTo,
  type SieraEmotion,
} from "@/lib/siera/character-state";

export interface Expression {
  /** How wide the eye sits when open: 1 = fully rounded, <1 = narrowed. */
  width: number;
  /** How much the eye arcs into a smile (morph 0..1 from open to happy arc). */
  smile: number;
  /** Vertical squint: 1 = heavily squinty, 0 = relaxed round. */
  squint: number;
  /** Slight pupil shift downward — reading, droop. */
  droop: number;
}

const EXPRESSIONS: Record<SieraEmotion, Expression> = {
  idle: { width: 1, smile: 0, squint: 0.12, droop: 0 },
  curious: { width: 1.05, smile: 0.06, squint: 0.1, droop: 0 },
  happy: { width: 1.1, smile: 0.3, squint: 0.2, droop: 0 },
  excited: { width: 1.15, smile: 0.45, squint: 0.15, droop: 0 },
  thinking: { width: 0.9, smile: 0, squint: 0.5, droop: 0.15 },
  confused: { width: 0.85, smile: 0, squint: 0.55, droop: 0.05 },
  surprised: { width: 1.3, smile: 0.05, squint: -0.3, droop: 0 },
  listening: { width: 1, smile: 0.1, squint: 0.16, droop: 0 },
  sleepy: { width: 0.8, smile: 0, squint: 0.7, droop: 0.35 },
  playful: { width: 1.08, smile: 0.5, squint: 0.18, droop: 0 },
  concerned: { width: 0.88, smile: 0, squint: 0.48, droop: 0.08 },
};

export class ExpressionController {
  private cur: Expression = { ...EXPRESSIONS.idle };
  private previous: SieraEmotion = "idle";

  reset(): void {
    this.cur = { ...EXPRESSIONS.idle };
    this.previous = "idle";
  }

  update(dt: number, emotion: SieraEmotion): Expression {
    const target = EXPRESSIONS[emotion];
    const changed = emotion !== this.previous;
    this.previous = emotion;

    // Emotion switches come with a hint of life: a little pop that fades as the
    // expression settles into its new shape.
    const tc = changed ? 0.18 : 0.5;

    this.cur = {
      width: smoothTo(this.cur.width, target.width, dt, tc),
      smile: smoothTo(this.cur.smile, target.smile, dt, tc),
      squint: smoothTo(this.cur.squint, target.squint, dt, tc),
      droop: smoothTo(this.cur.droop, target.droop, dt, tc),
    };

    return this.cur;
  }
}