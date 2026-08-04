"use client";

import { useMemo } from "react";

const COLORS = ["#58cc02", "#1cb0f6", "#ffc800", "#ff4b4b", "#ff9600", "#ce82ff"];

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Confetti({ pieces = 60 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: seeded(i, 1) * 100,
        delay: seeded(i, 2) * 2.5,
        duration: 2.5 + seeded(i, 3) * 2,
        color: COLORS[i % COLORS.length],
        width: 6 + seeded(i, 4) * 6,
        height: 8 + seeded(i, 5) * 8,
        rounded: seeded(i, 6) > 0.5,
      })),
    [pieces]
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {items.map((it) => (
        <span
          key={it.id}
          className="animate-confetti absolute top-0"
          style={{
            left: `${it.left}%`,
            width: it.width,
            height: it.height,
            backgroundColor: it.color,
            borderRadius: it.rounded ? "9999px" : "2px",
            animationDelay: `${it.delay}s`,
            animationDuration: `${it.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
