"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import { toggleLessonComplete } from "@/lib/actions/progress";
import { Button } from "@/components/ui/button";
import { ConfettiBurst } from "@/components/confetti-burst";

interface MarkLessonCompleteProps {
  lessonId: string;
  path: string;
  isDone: boolean;
  /** true dacă marcarea ACESTEI lecții completează capitolul */
  completesChapter: boolean;
}

export function MarkLessonComplete({
  lessonId,
  path,
  isDone,
  completesChapter,
}: MarkLessonCompleteProps) {
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const reduced = useReducedMotion();

  function handleClick() {
    startTransition(async () => {
      try {
        await toggleLessonComplete(lessonId, path);
      } catch {
        return;
      }
      if (!isDone && completesChapter) {
        setCelebrate(true);
        window.setTimeout(() => setCelebrate(false), 3400);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={isDone ? "outline" : "default"}
        size="lg"
        className="w-full"
        onClick={handleClick}
        disabled={pending}
      >
        {isDone ? (
          <>
            <Circle className="h-5 w-5" /> Marchează ca neparcursă
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" /> Marchează ca parcursă
          </>
        )}
      </Button>

      <AnimatePresence>
        {celebrate && <ChapterCelebration reduced={reduced} />}
      </AnimatePresence>
    </>
  );
}

function ChapterCelebration({ reduced }: { reduced: boolean | null }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        />

        {!reduced && <ConfettiBurst pieces={36} />}

        <motion.div
          initial={{ scale: 0.5, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="surface relative z-10 flex flex-col items-center gap-3 rounded-3xl px-10 py-8 text-center shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 13, delay: 0.08 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10"
          >
            <CheckCircle2 className="h-11 w-11 text-success" />
          </motion.div>
          <p className="text-xl font-extrabold tracking-tight text-ink">
            Capitol finalizat! 🎉
          </p>
          <p className="max-w-xs text-sm font-semibold text-subtle">
            Ai parcurs toate lecțiile acestui capitol. Felicitări!
          </p>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
