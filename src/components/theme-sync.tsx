"use client";

import { useEffect } from "react";
import { syncUserThemeCookie } from "@/lib/actions/themes";

export function ThemeSync() {
  useEffect(() => {
    let cancelled = false;

    syncUserThemeCookie()
      .then((slug) => {
        if (cancelled) return;
        if (slug && slug !== "default") {
          document.documentElement.dataset.theme = slug;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          (window as unknown as { __BACULET_THEME_READY?: boolean }).__BACULET_THEME_READY =
            true;
          window.dispatchEvent(new Event("baculet:theme-ready"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
