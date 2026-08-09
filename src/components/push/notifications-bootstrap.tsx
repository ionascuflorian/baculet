"use client";

import { useEffect } from "react";

// Înregistrează service worker-ul o singură dată, la încărcarea aplicației.
export function NotificationsBootstrap() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW register failed:", err));
  }, []);

  return null;
}
