"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";

export type SieraMood = "idle" | "thinking" | "happy";

const EYE_WANDER = 5;

interface SieraOrbProps {
  className?: string;
  mood?: SieraMood;
  ariaHidden?: boolean;
}

export function SieraOrb({
  className = "",
  mood = "idle",
  ariaHidden = false,
}: SieraOrbProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();

  const [wander, setWander] = useState({ x: 0, y: 0 });

  // Pop subtil la schimbarea stării.
  const prevMood = useRef(mood);
  useEffect(() => {
    if (prevMood.current === mood) return;
    prevMood.current = mood;
    controls.start({
      scale: [1, 1.04, 1],
      transition: { duration: 0.5, ease: "easeOut" },
    });
  }, [mood, controls]);

  // Ochii urmăresc cursorul cât timp e idle (încet, elegant).
  useEffect(() => {
    if (mood !== "idle") {
      setWander({ x: 0, y: 0 });
      return;
    }
    let alive = true;
    let raf = 0;
    const target = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, d / 260);
      target.x = (dx / d) * EYE_WANDER * pull;
      target.y = (dy / d) * EYE_WANDER * pull;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (alive) setWander({ x: target.x, y: target.y });
        });
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [mood]);

  return (
    <motion.div
      ref={wrapRef}
      animate={controls}
      aria-hidden={ariaHidden || undefined}
      className={`siera-orb-wrap ${className}`}
    >
      <div className={`siera-orb siera-orb--${mood} h-full w-full`}>
        <span className="siera-orb__screen">
          <span className="siera-orb__screen-glow" />
          <span className="siera-orb__eyes">
            <svg viewBox="0 0 64 32" className="h-full w-full">
              <g className="siera-orb__eye-pair">
                <motion.g
                  animate={{
                    x: mood === "idle" ? wander.x : 0,
                    y: mood === "idle" ? wander.y : 0,
                  }}
                  transition={{ type: "spring", stiffness: 160, damping: 18 }}
                >
                  <AnimatePresence initial={false}>
                    {mood === "happy" ? (
                      <motion.g
                        key="happy"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22 }}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      >
                        <path
                          className="siera-orb__eye"
                          d="M 6 8 Q 14 17 22 8"
                          stroke="currentColor"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          className="siera-orb__eye"
                          d="M 42 8 Q 50 17 58 8"
                          stroke="currentColor"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </motion.g>
                    ) : mood === "thinking" ? (
                      <motion.g
                        key="closed"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22 }}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      >
                        <path
                          className="siera-orb__eye"
                          d="M 6 13 Q 14 20 22 13"
                          stroke="currentColor"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          className="siera-orb__eye"
                          d="M 42 13 Q 50 20 58 13"
                          stroke="currentColor"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </motion.g>
                    ) : (
                      <motion.g
                        key="slits"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22 }}
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      >
                        <rect
                          className="siera-orb__eye"
                          x="8"
                          y="9"
                          width="7"
                          height="14"
                          rx="3.5"
                        />
                        <rect
                          className="siera-orb__eye"
                          x="49"
                          y="9"
                          width="7"
                          height="14"
                          rx="3.5"
                        />
                      </motion.g>
                    )}
                  </AnimatePresence>
                </motion.g>
              </g>
            </svg>
          </span>
        </span>
      </div>
    </motion.div>
  );
}
