"use client";

import { useEffect } from "react";
import { syncUserThemeCookie } from "@/lib/actions/themes";

export function ThemeSync() {
  useEffect(() => {
    let cancelled = false;

    const sync = () =>
      syncUserThemeCookie()
        .then((slug) => {
          if (cancelled) return;
          if (slug && slug !== "default") {
            document.documentElement.dataset.theme = slug;
          }
        })
        .catch(() => {});

    sync().finally(() => {
      if (!cancelled) {
        (window as unknown as { __BACULET_THEME_READY?: boolean }).__BACULET_THEME_READY =
          true;
        window.dispatchEvent(new Event("baculet:theme-ready"));
      }
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
