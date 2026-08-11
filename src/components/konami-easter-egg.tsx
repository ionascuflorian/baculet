"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const KONAMI_LABELS = ["↑", "↑", "↓", "↓", "←", "→", "←", "→", "B", "A"];

export function KonamiEasterEgg() {
  const [found, setFound] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key === "B" ? "b" : e.key === "A" ? "a" : e.key;
      if (key === KONAMI[idxRef.current]) {
        idxRef.current += 1;
        if (idxRef.current === KONAMI.length) {
          idxRef.current = 0;
          setFound(true);
        }
      } else {
        idxRef.current = key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {found && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mx-auto mt-10 w-full max-w-md rounded-3xl border-2 border-accent/40 bg-card p-5 text-left"
        >
          <p className="text-lg font-extrabold tracking-tight text-ink">
            <Sparkles className="mr-1.5 inline h-5 w-5 text-accent" />
            Cod secret deblocat!
          </p>
          <p className="mt-2 text-sm text-subtle">
            Siera a căutat pagina în toate caietele: era în spatele tablei.
            Primești <span className="font-bold text-ink">100 XP</span> pentru
            curaj — doar că aici nimeni nu ține scorul. Ia un test grilă și
            demonstrează-le tuturor că ai meritat.
          </p>
          <p className="mt-3 text-xs font-semibold text-subtle">
            Comanda ta secretă: {KONAMI_LABELS.join(" ")}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
