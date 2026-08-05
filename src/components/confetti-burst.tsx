"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#58cc02", "#1cb0f6", "#ffc800", "#ff4b4b", "#ff9600", "#ce82ff"];

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Explozie de confetti care pornește din centru (framer-motion, curățată cu AnimatePresence). */
export function ConfettiBurst({
  pieces = 30,
}: {
  pieces?: number;
}) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = seeded(i, 1) * Math.PI * 2;
        const dist = 90 + seeded(i, 2) * 160;
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rotate: 360 + seeded(i, 3) * 720,
          scale: 0.8 + seeded(i, 4) * 0.7,
          duration: 0.9 + seeded(i, 5) * 0.8,
          delay: seeded(i, 6) * 0.12,
          color: COLORS[i % COLORS.length],
          width: 6 + seeded(i, 7) * 6,
          height: 8 + seeded(i, 8) * 8,
          rounded: seeded(i, 9) > 0.5,
        };
      }),
    [pieces]
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((it) => (
        <motion.span
          key={it.id}
          className="absolute left-1/2 top-1/2"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
          animate={{
            x: it.x,
            y: it.y,
            opacity: 0,
            scale: it.scale,
            rotate: it.rotate,
          }}
          transition={{
            duration: it.duration,
            delay: it.delay,
            ease: "easeOut",
          }}
          style={{
            width: it.width,
            height: it.height,
            backgroundColor: it.color,
            borderRadius: it.rounded ? "9999px" : "2px",
          }}
        />
      ))}
    </div>
  );
}
