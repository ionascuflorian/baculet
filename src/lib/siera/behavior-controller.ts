// What Siera is doing — the intent layer. The behaviour FSM runs continuous
// "living" micro-states while not otherwise engaged, blends in emotional
// reactions, and decides when to glance, blink, or react. It never touches the
// DOM; it only produces decisions for the gaze/expression/body controllers.

import {
  clamp,
  pickWeighted,
  randRange,
  smoothTo,
  type CharacterInputs,
  type IdleMicroState,
  type Point2D,
  type SieraEmotion,
  type SieraReaction,
} from "@/lib/siera/character-state";

export interface BehaviorOutput {
  emotion: SieraEmotion;
  /** Idle glance bias used by the gaze controller. */
  idleBias: Point2D;
  /** 0..1 attention energy — how strongly Siera is "tuned" to the user right now. */
  attention: number;
  /** 0..1 excitement level — breathes/quicken the body. */
  energy: number;
  /** 0..1 overall liveliness used to scale micro-motion. */
  liveliness: number;
}

/** Fold SieraReaction into a momentary emotion impulse. */
const REACTION_TO_EMOTION: Record<SieraReaction, SieraEmotion> = {
  squash: "playful",
  nudge: "playful",
  bounce: "excited",
  attention: "surprised",
  confuse: "confused",
  peek: "curious",
};

/** Probability that, on a decision tick, Siera picks each micro-state. */
function idleWeights(moodAttention: boolean): ReadonlyArray<readonly [IdleMicroState, number]> {
  return [
    ["neutral", moodAttention ? 0.18 : 0.3],
    ["glance", 0.28],
    ["curious", 0.2],
    ["relax", 0.14],
    ["micro", 0.08],
  ];
}

function glanceDirection(): Point2D {
  const dirs: ReadonlyArray<readonly [Point2D, number]> = [
    [{ x: 0, y: 0 }, 0.34], // straight on
    [{ x: 2.2, y: -0.8 }, 0.16],
    [{ x: -2.2, y: -0.8 }, 0.16],
    [{ x: 1.8, y: 1 }, 0.13],
    [{ x: -1.8, y: 1 }, 0.13],
    [{ x: 0, y: -2 }, 0.08],
  ];
  return pickWeighted(dirs);
}

export class BehaviorController {
  private state: IdleMicroState = "neutral";
  private stateTill = 0;
  private glance = glanceDirection();

  private impulseUntil = 0;
  private impulseFrom = 0;

  private attention = 0;
  private energy = 0;
  private lastReaction: SieraReaction | null = null;
  private reactionUntil = 0;
  private reactionEmotion: SieraEmotion | null = null;
  private reactionGlance: Point2D | null = null;

  private time = 0;
  private decisionIn = randRange(2.8, 6);

  reset(): void {
    this.state = "neutral";
    this.stateTill = 0;
    this.attention = 0;
    this.energy = 0;
    this.lastReaction = null;
    this.reactionUntil = 0;
    this.reactionEmotion = null;
    this.reactionGlance = null;
    this.time = 0;
  }

  /** Called once on the frame a NEW reaction arrives. */
  onReaction(reaction: SieraReaction): void {
    this.reactionEmotion = REACTION_TO_EMOTION[reaction];
    this.reactionGlance = glanceDirection();
    // Reactions have a short hormonal tail, then decay back into the idle FSM.
    this.reactionUntil = this.time + randRange(2.2, 3.4);
    // A nudge/bounce should also disturb the body — expressed as energy spike.
    if (reaction === "bounce" || reaction === "attention" || reaction === "squash") {
      this.energy = 1;
    }
  }

  private runIdleFsm(dt: number, inputs: CharacterInputs): void {
    this.decisionIn -= dt;
    if (this.decisionIn > 0 && this.time < this.stateTill) return;
    this.decisionIn = randRange(1.6, 4.2);

    const weights = idleWeights(inputs.attentive && !inputs.reduced);
    const next = pickWeighted(weights);
    this.state = next;
    this.stateTill = this.time + randRange(1.4, 3.6);
    if (next === "glance" || next === "curious" || next === "micro") {
      this.glance = glanceDirection();
    }
  }

  update(dt: number, inputs: CharacterInputs): BehaviorOutput {
    this.time += dt;
    this.runIdleFsm(dt, inputs);

    // Attention climbs while the cursor is near and the user interacts, then
    // decays with a slow, organic ease back toward the ambient level.
    const targetAttention = clamp(
      (inputs.trackCursor ? inputs.near * 0.85 : 0) +
        (inputs.attentive ? 0.55 : 0) +
        (inputs.gaze !== "cursor" ? 0.2 : 0),
      0,
      1
    );
    this.attention = smoothTo(this.attention, targetAttention, dt, 0.9);

    this.energy = smoothTo(this.energy, 0, dt, 1.1);

    // Resolve the current emotion.
    let emotion: SieraEmotion = "idle";
    if (this.reactionEmotion && this.time < this.reactionUntil) {
      emotion = this.reactionEmotion;
    } else {
      this.reactionEmotion = null;
      this.reactionGlance = null;
      switch (inputs.mood) {
        case "thinking":
          emotion = "thinking";
          break;
        case "speaking":
          emotion = this.attention > 0.4 ? "curious" : "excited";
          break;
        case "happy":
          emotion = this.attention > 0.45 ? "excited" : "happy";
          break;
        case "idle":
        default: {
          if (inputs.attentive) emotion = "listening";
          else if (this.state === "glance" || this.state === "micro") emotion = "curious";
          else emotion = "idle";
        }
      }
      // Cross-feelings: a sleepy idle who is approached perks up a touch.
      if (emotion === "idle" && this.attention > 0.5) emotion = "curious";
    }

    // Idle glance bias only when idle-ish and no reaction is active.
    let idleBias: Point2D = { x: 0, y: 0 };
    if (this.reactionGlance) idleBias = this.reactionGlance;
    else if (emotion === "idle" || emotion === "curious") idleBias = this.glance;

    const liveliness =
      (0.55 + this.attention * 0.25 + this.energy * 0.2) * (inputs.reduced ? 0.12 : 1);

    return {
      emotion,
      idleBias,
      attention: this.attention,
      energy: this.energy,
      liveliness,
    };
  }
}