"use client";

import { useEffect, useRef, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import type { DragEndEvent } from "@dnd-kit/react";
import {
  Settings2,
  Eye,
  EyeOff,
  GripVertical,
  Check,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGETS,
  normalizePrefs,
  type DashboardPrefs,
  type WidgetId,
  type WidgetSize,
} from "@/lib/dashboard-widgets";
import { saveDashboardWidgets } from "@/lib/actions/dashboard";
import { OPEN_WIDGET_SETTINGS_EVENT } from "@/lib/widget-events";

const WIDGET_ICONS: Record<string, string> = {
  greeting: "👋",
  bac: "🎓",
  weather: "🌤️",
  calendar: "📅",
  resume: "▶️",
};

const SIZE_LABEL: Record<WidgetSize, string> = {
  small: "Mic",
  medium: "Mediu",
  large: "Mare",
};

const SIZE_CYCLE: WidgetSize[] = ["small", "medium", "large"];

function SortableRow({
  id,
  index,
  visible,
  size,
  onToggle,
  onSize,
}: {
  id: WidgetId;
  index: number;
  visible: boolean;
  size: WidgetSize;
  onToggle: () => void;
  onSize: () => void;
}) {
  const handleRef = useRef<HTMLButtonElement>(null);
  const { ref, isDragging } = useSortable({ id, index, handle: handleRef });
  const meta = WIDGETS.find((w) => w.id === id);

  if (!meta) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-xl px-2 py-1.5",
        isDragging && "opacity-60 ring-1 ring-accent/40",
        visible ? "bg-ink/5" : "opacity-50"
      )}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`Trage ${meta.label}`}
        className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-full text-subtle hover:bg-card hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-base">{WIDGET_ICONS[id]}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
        {meta.label}
      </span>
      <button
        type="button"
        onClick={onSize}
        aria-label="Schimbă mărimea"
        className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-subtle hover:bg-card hover:text-ink"
      >
        <Maximize2 className="h-3 w-3" />
        {SIZE_LABEL[size]}
      </button>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${visible ? "Ascunde" : "Arată"} ${meta.label}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-card hover:text-ink"
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

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

  function cycleSize(id: WidgetId) {
    setDraft((d) => {
      const current = d.sizes?.[id] ?? "small";
      const next =
        SIZE_CYCLE[(SIZE_CYCLE.indexOf(current) + 1) % SIZE_CYCLE.length];
      return { ...d, sizes: { ...d.sizes, [id]: next } };
    });
  }

  const handleReorder = (event: DragEndEvent) => {
    if (event.canceled) return;
    setDraft((d) => ({ ...d, order: move([...d.order], event) }));
  };

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
              Trage cu mânerul pentru a reordona. Atinge mărimea pentru a
              schimba lățimea.
            </p>
            <DragDropProvider onDragEnd={handleReorder}>
              <ul className="space-y-1.5">
                {draft.order.map((id, index) => (
                  <li key={id}>
                    <SortableRow
                      id={id}
                      index={index}
                      visible={!draft.hidden.includes(id)}
                      size={draft.sizes?.[id] ?? "small"}
                      onToggle={() => toggle(id)}
                      onSize={() => cycleSize(id)}
                    />
                  </li>
                ))}
              </ul>
            </DragDropProvider>
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
