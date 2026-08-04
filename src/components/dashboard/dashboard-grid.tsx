"use client";

import { Children, useRef, type ReactNode } from "react";
import { OPEN_WIDGET_SETTINGS_EVENT } from "@/lib/widget-events";

function PressableCell({ children }: { children: ReactNode }) {
  const timer = useRef<number | null>(null);

  const cancel = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return (
    <div
      onPointerDown={() => {
        cancel();
        timer.current = window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent(OPEN_WIDGET_SETTINGS_EVENT));
        }, 450);
      }}
      onPointerMove={cancel}
      onPointerUp={cancel}
      onPointerLeave={cancel}
    >
      {children}
    </div>
  );
}

export function DashboardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {Children.map(children, (child, i) => (
        <PressableCell key={i}>{child}</PressableCell>
      ))}
    </div>
  );
}