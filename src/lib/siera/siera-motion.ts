// Shared vocabulary for Siera as a UI companion.
//
// One visual component (`SieraOrb`) is driven by a small set of states and
// micro-reactions. Contexts (login, cookie, chat, …) pick a positioning and
// map their own events to these states — the visual layer never changes.

/** Where Siera appears. Determines the available gaze decisions, not the looks. */
export type SieraContext =
  | "login"
  | "register"
  | "cookie"
  | "chat"
  | "dashboard"
  | "default";

/** High-level companion state, mapped to mood / lookAt / reaction by consumers. */
export type SieraState =
  | "idle"
  | "looking"
  | "typing"
  | "buttonHover"
  | "buttonPressed"
  | "loading"
  | "success"
  | "error";

/** Short physical gesture played once, then Siera returns to normal. */
export type SieraReaction =
  | "squash"
  | "nudge"
  | "bounce"
  | "attention"
  | "confuse"
  | "peek";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GazeOptions {
  /** Horizontal sensitivity (offset px per px of horizontal distance). */
  gainX?: number;
  /** Vertical sensitivity (offset px per px of vertical distance). */
  gainY?: number;
  /** Max horizontal offset — eyes never leave the blob. */
  maxX?: number;
  /** Max vertical offset — eyes never leave the blob. */
  maxY?: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Redirects the eyes toward a target element, as a small clamped offset in px.
 * The mapping is geometric but smoothed by the orb's spring, and clipped so the
 * eyes stay inside the blob — no raw cursor-following.
 */
export function lookAtOffset(
  orbRect: Rect,
  targetRect: Rect,
  options: GazeOptions = {}
): Point {
  const gainX = options.gainX ?? 0.014;
  const gainY = options.gainY ?? 0.028;
  const maxX = options.maxX ?? 5.5;
  const maxY = options.maxY ?? 4;

  const ox = orbRect.left + orbRect.width / 2;
  const oy = orbRect.top + orbRect.height / 2;
  const tx = targetRect.left + targetRect.width / 2;
  const ty = targetRect.top + targetRect.height / 2;

  return {
    x: clamp((tx - ox) * gainX, -maxX, maxX),
    y: clamp((ty - oy) * gainY, -maxY, maxY),
  };
}

/** Siera's relaxed default gaze toward the form (a soft look to the right). */
export const DEFAULT_FORM_GAZE: Point = { x: 3.2, y: 0 };