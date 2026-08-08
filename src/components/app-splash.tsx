"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const MIN_VISIBLE_MS = 800;
const MAX_VISIBLE_MS = 6000;

export function AppSplash() {
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let loaded = document.readyState === "complete";
    let minDone = false;
    let themeReady =
      (window as unknown as { __BACULET_THEME_READY?: boolean })
        .__BACULET_THEME_READY === true;

    const maybeHide = () => {
      if (loaded && minDone && themeReady) setHidden(true);
    };

    const onLoad = () => {
      loaded = true;
      maybeHide();
    };

    const onThemeReady = () => {
      themeReady = true;
      maybeHide();
    };

    const minTimer = setTimeout(() => {
      minDone = true;
      maybeHide();
    }, MIN_VISIBLE_MS);

    const capTimer = setTimeout(() => setHidden(true), MAX_VISIBLE_MS);

    window.addEventListener("load", onLoad);
    window.addEventListener("baculet:theme-ready", onThemeReady);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(capTimer);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("baculet:theme-ready", onThemeReady);
    };
  }, []);

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          className="app-splash fixed inset-0 z-[9000] flex flex-col items-center justify-center gap-6 bg-background"
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={{ duration: reduce ? 0.15 : 0.45, ease: "easeInOut" }}
          role="status"
          aria-label="Se încarcă Baculet"
        >
          <p className="app-splash-logo select-none text-5xl font-extrabold tracking-tight text-ink sm:text-6xl">
            Baculet<span className="text-accent">.</span>
          </p>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="app-splash-dot inline-block h-2 w-2 rounded-full bg-accent"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="sr-only">Se încarcă Baculet…</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
