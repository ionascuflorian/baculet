"use client";

import { useEffect, useState } from "react";
import { Settings2, Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGETS,
  normalizePrefs,
  type DashboardPrefs,
  type WidgetId,
} from "@/lib/dashboard-widgets";
import { saveDashboardWidgets } from "@/lib/actions/dashboard";
import { OPEN_WIDGET_SETTINGS_EVENT } from "@/lib/widget-events";

const WIDGET_ICONS: Record<string, string> = {
  greeting: "👋",
  bac: "🎓",
  weather: "🌤️",
  calendar: "📅",
  resume: "▶️",
  pomodoro: "🍅",
  todo: "✅",
};

export function WidgetSettings({ prefs }: { prefs: DashboardPrefs }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DashboardPrefs>(() => normalizePrefs(prefs));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_WIDGET_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(OPEN_WIDGET_SETTINGS_EVENT, handler);
  }, []);

  async function save() {
    setSaving(true);
    await saveDashboardWidgets(normalizePrefs(draft));
    setSaving(false);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  function toggle(id: WidgetId) {
    setDraft((d) => ({
      ...d,
      hidden: d.hidden.includes(id)
        ? d.hidden.filter((x) => x !== id)
        : [...d.hidden, id],
    }));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Personalizează widget-urile"
        className="surface flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:text-accent"
      >
        <Settings2 className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="surface absolute right-0 z-50 mt-2 w-80 rounded-2xl p-4 shadow-lg">
            <h3 className="mb-3 font-bold text-ink">
              Personalizează dashboard-ul
            </h3>
            <p className="mb-3 text-xs text-subtle">
              Trage cardurile direct pe dashboard ca să le reordonezi. Aici poți
              alege care apar.
            </p>
            <ul className="space-y-1.5">
              {draft.order.map((id) => {
                const meta = WIDGETS.find((w) => w.id === id);
                if (!meta) return null;
                const visible = !draft.hidden.includes(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors",
                        visible ? "bg-ink/5 hover:bg-ink/10" : "opacity-50"
                      )}
                    >
                      <span className="text-base">{WIDGET_ICONS[id]}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                        {meta.label}
                      </span>
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          visible
                            ? "text-subtle hover:text-ink"
                            : "text-subtle hover:text-ink"
                        )}
                      >
                        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {done ? (
                <>
                  <Check className="h-4 w-4" /> Salvat
                </>
              ) : saving ? (
                "Se salvează…"
              ) : (
                "Salvează"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
