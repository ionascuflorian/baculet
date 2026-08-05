"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/confetti-burst";
import { cn } from "@/lib/utils";

function CountUp({
  value,
  reduced,
}: {
  value: number;
  reduced: boolean | null;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => String(Math.round(v)));

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv, reduced]);

  return <motion.span>{text}</motion.span>;
}

interface ScoreRevealProps {
  score: number;
  maxScore: number;
  pct: number;
  retryHref: string;
}

export function ScoreReveal({ score, maxScore, pct, retryHref }: ScoreRevealProps) {
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState(false);
  const highScore = pct >= 80;
  const passed = pct >= 50;

  // Mică întârziere, ca piesa să „intre" în scenă după pop-in-ul cardului.
  useEffect(() => {
    const id = window.setTimeout(() => setBurst(true), 350);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("surface relative overflow-hidden rounded-[1.25rem] text-center")}
    >
      <AnimatePresence>
        {burst && !reduced && (
          <ConfettiBurst pieces={highScore ? 46 : passed ? 24 : 0} />
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-3 px-6 py-8">
        <motion.div
          initial={{ scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 12, delay: 0.15 }}
          className={cn(
            "flex h-20 w-20 items-center justify-center rounded-2xl",
            passed ? "bg-success/10" : "bg-danger/10"
          )}
        >
          <motion.span
            animate={
              highScore
                ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.12, 1] }
                : {}
            }
            transition={{ duration: 1.4, delay: 1.1, repeat: Infinity, repeatDelay: 3.5 }}
          >
            <Trophy
              className={cn("h-10 w-10", passed ? "text-success" : "text-danger")}
            />
          </motion.span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
          className="text-2xl font-extrabold text-ink"
        >
          Scorul tău: <CountUp value={score} reduced={reduced} />
          <span className="text-subtle">/{maxScore}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.45, ease: "easeOut" }}
          className="text-subtle"
        >
          {highScore
            ? "Excelent! Ești pregătit. 🔥"
            : passed
              ? "Bine! Mai exersează puțin."
              : "Hai, mai încearcă o dată. Vei reuși!"}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4, ease: "easeOut" }}
        >
          <Button asChild variant="outline" size="sm">
            <Link href={retryHref}>
              <RotateCcw className="h-4 w-4" /> Rezolvă din nou
            </Link>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
