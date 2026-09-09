"use client";

import { useEffect } from "react";
import { syncUserThemeCookie } from "@/lib/actions/themes";
import { THEME_READY_EVENT, THEME_READY_FLAG } from "@/lib/theme-constants";

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
        (window as unknown as Record<string, unknown>)[THEME_READY_FLAG] = true;
        window.dispatchEvent(new Event(THEME_READY_EVENT));
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
