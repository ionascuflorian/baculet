"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";

export type SieraMood = "idle" | "thinking" | "speaking" | "happy";
export type SieraGaze = "cursor" | "input" | "user";

// Distanța la care Siera „simte" prezența cursorului (px).
const PROXIMITY = 200;

interface SieraOrbProps {
  className?: string;
  mood?: SieraMood;
  gaze?: SieraGaze;
  ariaHidden?: boolean;
}

const PARTICLES = [
  { left: "12%", top: "20%", dur: "14s" },
  { left: "84%", top: "26%", dur: "17s" },
  { left: "78%", top: "80%", dur: "15s" },
  { left: "20%", top: "76%", dur: "18s" },
];

export function SieraOrb({
  className = "",
  mood = "idle",
  gaze = "cursor",
  ariaHidden = false,
}: SieraOrbProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const [hover, setHover] = useState(false);
  const [wander, setWander] = useState({ x: 0, y: 0 });

  // Priviri lente „în jur" când stă liniștită — din când în când.
  const [idleLook, setIdleLook] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const glance = () => {
      if (!alive) return;
      setIdleLook({
        x: (Math.random() - 0.5) * 7,
        y: (Math.random() - 0.5) * 4.5,
      });
      t = setTimeout(glance, 2400 + Math.random() * 3200);
    };
    t = setTimeout(glance, 1600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

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

  // Prezența cursorului: ridicarea, lumina și ochii răspund continuu la distanță.
  useEffect(() => {
    let alive = true;
    let raf = 0;
    const target = { x: 0, y: 0 };
    let pullVal = 0;
    let hovering = false;
    const reset = () => {
      pullVal = 0;
      target.x = 0;
      target.y = 0;
      hovering = false;
      setHover(false);
      wrapRef.current?.style.setProperty("--hover-pull", "0");
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (alive) setWander({ x: 0, y: 0 });
        });
      }
    };
    const onMove = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      const near = d < PROXIMITY;
      if (near !== hovering) {
        hovering = near;
        setHover(near);
      }
      if (near) {
        const pull = Math.min(1, (PROXIMITY - d) / PROXIMITY);
        pullVal = pull;
        target.x = (dx / d) * 4.5 * pull;
        target.y = (dy / d) * 4.5 * pull;
      } else {
        pullVal = 0;
        target.x = 0;
        target.y = 0;
      }
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (!alive) return;
          wrapRef.current?.style.setProperty("--hover-pull", pullVal.toFixed(3));
          setWander({ x: target.x, y: target.y });
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", reset);
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", reset);
    };
  }, []);

  // Spre unde privește Siera, în funcție de stare.
  const gazeOffset = useMemo(() => {
    if (mood === "thinking") return { x: 0, y: -3 };
    if (gaze === "input") return { x: 0, y: 4 };
    if (gaze === "user") return { x: 0, y: 2 };
    if (mood === "idle") return hover ? wander : idleLook;
    return { x: 0, y: 0 };
  }, [mood, gaze, hover, wander, idleLook]);

  const smile = mood === "happy" || mood === "speaking";

  return (
    <motion.div
      ref={wrapRef}
      animate={controls}
      aria-hidden={ariaHidden || undefined}
      className={`siera-orb-wrap ${className}`}
    >
      <span className="siera-orb__fog" aria-hidden />
      <span className="siera-orb__halo" aria-hidden />
      <div className="siera-orb__lift">
        <div className={`siera-orb siera-orb--${mood} h-full w-full`}>
          <span className="siera-orb__energy" aria-hidden />
          <span className="siera-orb__glass" aria-hidden />
          <span className="siera-orb__reflection" aria-hidden />
          <span className="siera-orb__eyes">
            <svg viewBox="0 0 64 32" className="h-full w-full">
              <g className="siera-orb__eye-pair">
                <motion.g
                  animate={{ x: gazeOffset.x, y: gazeOffset.y }}
                  transition={{ type: "spring", stiffness: 150, damping: 30 }}
                >
                  <AnimatePresence initial={false}>
                    {smile ? (
                      <motion.g
                        key="smile"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      >
                        <path
                          className="siera-orb__eye siera-orb__eye--smile"
                          d="M 9.5 13 Q 16 20 22.5 13"
                          strokeWidth="4"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          className="siera-orb__eye siera-orb__eye--smile"
                          d="M 41.5 13 Q 48 20 54.5 13"
                          strokeWidth="4"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </motion.g>
                    ) : (
                      <motion.g
                        key="open"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      >
                        <ellipse
                          className="siera-orb__eye siera-orb__eye--open"
                          cx="15.5"
                          cy="16"
                          rx="3.2"
                          ry="5.4"
                        />
                        <ellipse
                          className="siera-orb__eye siera-orb__eye--open"
                          cx="48.5"
                          cy="16"
                          rx="3.2"
                          ry="5.4"
                        />
                      </motion.g>
                    )}
                  </AnimatePresence>
                </motion.g>
              </g>
            </svg>
          </span>
        </div>
      </div>
      <span className="siera-orb__particles" aria-hidden>
        {PARTICLES.map((p, i) => (
          <i
            key={i}
            className="siera-orb__particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: `${i * 2.3}s`,
              animationDuration: p.dur,
            }}
          />
        ))}
      </span>
    </motion.div>
  );
}
