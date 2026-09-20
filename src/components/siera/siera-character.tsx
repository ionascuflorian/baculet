"use client";

// Siera's living layer — a single requestAnimationFrame loop with plain DOM
// writes (no React render in the loop). Controllers decide: behaviour (intent),
// gaze, blink, expression, body morph, ambient. The component only wires them
// to the DOM and handles visibility / cursor proximity / reduced motion.
//
// Everything here is performance-conscious: refs, no setState in the loop, CSS
// custom properties + attribute writes, pauses when hidden or off-screen.

import { useEffect, useRef, type RefObject } from "react";
import { clamp, type Point, type SieraReaction } from "@/lib/siera/siera-motion";
import type { SieraMood, SieraGaze } from "@/components/siera/siera-orb";
import {
  type CharacterInputs,
  type Point2D,
} from "@/lib/siera/character-state";
import { BehaviorController } from "@/lib/siera/behavior-controller";
import { BlinkController } from "@/lib/siera/blink-controller";
import { GazeController } from "@/lib/siera/gaze-controller";
import { ExpressionController } from "@/lib/siera/expression-controller";
import { BodyController } from "@/lib/siera/body-controller";
import { AmbientController } from "@/lib/siera/ambient-controller";

const PROXIMITY = 200;

const PARTICLES = [
  { left: "12%", top: "20%", phase: 0.0 },
  { left: "84%", top: "26%", phase: 1.2 },
  { left: "78%", top: "80%", phase: 2.3 },
  { left: "20%", top: "76%", phase: 3.4 },
];

interface SieraCharacterProps {
  mood: SieraMood;
  gaze: SieraGaze;
  lookAt: Point | null;
  reaction: SieraReaction | null;
  trackCursor: boolean;
  attentive: boolean;
  reduced: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
}

const EYE_RY = 5.4;
const EYE_RX = 3.2;

export function SieraCharacter({
  mood,
  gaze,
  lookAt,
  reaction,
  trackCursor,
  attentive,
  reduced,
  rootRef,
}: SieraCharacterProps) {
  const fogRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const energyRef = useRef<HTMLSpanElement>(null);
  const bodyRefDOM = useRef<HTMLDivElement>(null);
  const particleRefs = useRef<(HTMLElement | null)[]>([]);
  const eyeLRef = useRef<SVGGElement>(null);
  const eyeRRef = useRef<SVGGElement>(null);
  const ellLRef = useRef<SVGEllipseElement>(null);
  const ellRRef = useRef<SVGEllipseElement>(null);
  const smileLRef = useRef<SVGPathElement>(null);
  const smileRRef = useRef<SVGPathElement>(null);

  // Latest props preserved for the loop via a ref — no restarts on prop change.
  const propsRef = useRef({ mood, gaze, lookAt, reaction, trackCursor, attentive, reduced });
  useEffect(() => {
    propsRef.current = { mood, gaze, lookAt, reaction, trackCursor, attentive, reduced };
  });

  useEffect(() => {
    const behavior = new BehaviorController();
    const blink = new BlinkController();
    const gazeC = new GazeController();
    const expr = new ExpressionController();
    const body = new BodyController();
    const ambient = new AmbientController();
    let lastReaction: SieraReaction | null = null;

    let raf = 0;
    let running = true;
    let last = performance.now();
    const cursor = { x: 0, y: 0, near: 0 };
    let targetNear = 0;
    let dirX = 0;
    let dirY = 0;

    const applyVar = (name: string, value: string) => {
      rootRef.current?.style.setProperty(name, value);
    };

    // Cursor proximity — sampled per frame into a smoothed `near`.
    const onMove = (e: MouseEvent) => {
      const latest = propsRef.current;
      if (!latest.trackCursor || latest.gaze === "input" || latest.gaze === "user") return;
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      if (d < PROXIMITY) {
        targetNear = Math.min(1, 1 - d / PROXIMITY);
        dirX = dx / d;
        dirY = dy / d;
      } else {
        targetNear = 0;
        dirX = 0;
        dirY = 0;
      }
      cursor.x = dirX;
      cursor.y = dirY;
    };
    const onLeave = () => {
      targetNear = 0;
      dirX = 0;
      dirY = 0;
    };

    const onVisibility = () => {
      running = !document.hidden;
    };

    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && rootRef.current) {
      io = new IntersectionObserver(
        ([entry]) => {
          running = entry.isIntersecting && !document.hidden;
        },
        { threshold: 0.001 }
      );
      io.observe(rootRef.current);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!running) return;

      const p = propsRef.current;
      cursor.near += (targetNear - cursor.near) * Math.min(1, dt * 8);
      applyVar("--hover-pull", cursor.near.toFixed(3));

      const inputs: CharacterInputs = {
        mood: p.mood,
        gaze: p.gaze,
        lookAt: p.lookAt,
        reaction: p.reaction,
        trackCursor: p.trackCursor,
        attentive: p.attentive,
        reduced: p.reduced,
        near: cursor.near,
        cursorDir: { x: cursor.x, y: cursor.y },
      };

      // Reactions are one-shot impulses into the controllers.
      if (p.reaction && p.reaction !== lastReaction) {
        lastReaction = p.reaction;
        behavior.onReaction(p.reaction);
        body.bump();
        if (!p.reduced && (p.reaction === "attention" || p.reaction === "confuse")) {
          blink.request("quick");
        }
      }

      const out = behavior.update(dt, inputs);

      const blinkO = blink.update(dt, inputs, out.emotion);
      const shape = expr.update(dt, out.emotion);
      const gazeO = gazeC.update(dt, inputs, out.emotion, viewOffset(p), out.idleBias);

      const bodyO = p.reduced
        ? { borderRadius: "46% 54% 58% 42% / 42% 46% 54% 58%", scaleX: 1, scaleY: 1, ty: 0, rotate: 0 }
        : body.update(dt, out.emotion);
      const amb = p.reduced
        ? {
            fogOpacity: 0.5,
            fogScale: 1,
            haloOpacity: 0.5,
            haloScale: 1,
            energyRotate: 0,
            particles: PARTICLES.map(() => ({ y: 0, opacity: 0.65 })),
          }
        : ambient.update(dt, out.energy, out.attention);

      // --- Eyes ---
      applyEye(eyeLRef.current, ellLRef.current, smileLRef.current, gazeO.left, blinkO.openL, shape);
      applyEye(eyeRRef.current, ellRRef.current, smileRRef.current, gazeO.right, blinkO.openR, shape);

      // --- Body ---
      const orb = bodyRefDOM.current;
      if (orb) {
        orb.style.borderRadius = bodyO.borderRadius;
        orb.style.transform = `translateY(${bodyO.ty}px) rotate(${bodyO.rotate}deg) scale(${bodyO.scaleX}, ${bodyO.scaleY})`;
      }

      // --- Ambient ---
      const fog = fogRef.current;
      if (fog) {
        fog.style.opacity = p.reduced ? "0.5" : amb.fogOpacity.toFixed(3);
        fog.style.transform = `translate(-50%, -50%) scale(${amb.fogScale.toFixed(3)})`;
      }
      const halo = haloRef.current;
      if (halo) {
        halo.style.transform = `translate(-50%, -50%) scale(${amb.haloScale.toFixed(3)})`;
      }
      // Halo brightness pulse rides on top of the mood-base opacity via a CSS var.
      applyVar("--orb-halo-dyn", p.reduced ? "0" : ((amb.haloOpacity - 0.5) * 0.5).toFixed(3));
      const energy = energyRef.current;
      if (energy) energy.style.transform = `rotate(${amb.energyRotate.toFixed(1)}deg)`;

      // --- Particles ---
      for (let i = 0; i < PARTICLES.length; i++) {
        const el = particleRefs.current[i];
        if (!el) continue;
        const base = amb.particles[i];
        if (!base) continue;
        el.style.transform = `translateY(${base.y.toFixed(1)}px)`;
        el.style.opacity = p.reduced ? "0.65" : base.opacity.toFixed(3);
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <span ref={fogRef} className="siera-orb__fog" aria-hidden />
      <span ref={haloRef} className="siera-orb__halo" aria-hidden />
      <div className="siera-orb__lift">
        <div
          ref={bodyRefDOM}
          className={`siera-orb siera-orb--${mood} h-full w-full`}
        >
          <span ref={energyRef} className="siera-orb__energy" aria-hidden />
          <span className="siera-orb__glass" aria-hidden />
          <span className="siera-orb__reflection" aria-hidden />
          <span className="siera-orb__eyes">
            <svg viewBox="0 0 64 32" className="h-full w-full">
              <g className="siera-orb__eye-pair">
                <g ref={eyeLRef}>
                  <ellipse
                    ref={ellLRef}
                    className="siera-orb__eye siera-orb__eye--open"
                    cx="15.5"
                    cy="16"
                    rx={EYE_RX}
                    ry={EYE_RY}
                  />
                  <path
                    ref={smileLRef}
                    className="siera-orb__eye siera-orb__eye--smile"
                    d="M 9.5 13 Q 16 20 22.5 13"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0"
                  />
                </g>
                <g ref={eyeRRef}>
                  <ellipse
                    ref={ellRRef}
                    className="siera-orb__eye siera-orb__eye--open"
                    cx="48.5"
                    cy="16"
                    rx={EYE_RX}
                    ry={EYE_RY}
                  />
                  <path
                    ref={smileRRef}
                    className="siera-orb__eye siera-orb__eye--smile"
                    d="M 41.5 13 Q 48 20 54.5 13"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0"
                  />
                </g>
              </g>
            </svg>
          </span>
        </div>
      </div>
      <span className="siera-orb__particles" aria-hidden>
        {PARTICLES.map((p, i) => (
          <i
            key={i}
            ref={(el) => {
              particleRefs.current[i] = el;
            }}
            className="siera-orb__particle"
            style={{ left: p.left, top: p.top }}
          />
        ))}
      </span>
    </>
  );
}

function viewOffset(p: {
  gaze: SieraGaze;
  lookAt: Point | null;
}): Point2D | null {
  if (p.lookAt) return { x: clamp(p.lookAt.x, -6, 6), y: clamp(p.lookAt.y, -4.5, 4.5) };
  if (p.gaze === "input") return { x: 0, y: 3.6 };
  if (p.gaze === "user") return { x: 0, y: 2.2 };
  return null;
}

function applyEye(
  g: SVGGElement | null,
  ell: SVGEllipseElement | null,
  smile: SVGPathElement | null,
  gazePt: Point2D,
  openness: number,
  shape: { width: number; smile: number; squint: number; droop: number }
): void {
  if (!g || !ell || !smile) return;

  // Smile morfs the open ellipse into the happy arc (opacity cross-fade).
  const smileO = clamp(shape.smile, 0, 1);
  ell.setAttribute("opacity", String(clamp(1 - smileO * 1.15, 0, 1)));
  smile.setAttribute("opacity", String(clamp(smileO * 1.15 - 0.05, 0, 1)));

  // Openness: blink + squint. Squint narrows the eye vertically.
  const squintF = 1 - clamp(shape.squint, 0, 1) * 0.42;
  const ry = EYE_RY * openness * squintF;
  const rx = EYE_RX * (0.8 + shape.width * 0.2 + (1 - openness) * 0.2);
  ell.setAttribute("rx", rx.toFixed(2));
  ell.setAttribute("ry", ry.toFixed(2));

  const droopShift = shape.droop * 2.2;
  g.setAttribute(
    "transform",
    `translate(${gazePt.x.toFixed(2)} ${(gazePt.y + droopShift).toFixed(2)})`
  );
}