"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Trash2,
  X,
  Trophy,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import {
  addCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/actions/calendar";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const KIND_COLORS: Record<string, string> = {
  USER: "#0a7cff",
  ACHIEVEMENT: "#34c759",
  EXAM: "#ff9500",
};

const SWATCHES = ["#0a7cff", "#ff3b30", "#ff9500", "#34c759", "#af52de", "#5e5ce6"];

export interface CalendarEventItem {
  id: string;
  date: string; // ISO
  title: string;
  color: string | null;
  kind: "USER" | "ACHIEVEMENT" | "EXAM";
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CalendarWidget({
  events = [],
}: {
  events?: CalendarEventItem[];
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthName = new Date(year, month, 1).toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstWeekday + 6) % 7; // make Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateKey(now);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const eventsByDay = new Map<string, CalendarEventItem[]>();
  for (const ev of events) {
    const key = localDateKey(new Date(ev.date));
    if (key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
      const list = eventsByDay.get(key) ?? [];
      list.push(ev);
      eventsByDay.set(key, list);
    }
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthEvents = Array.from(eventsByDay.values()).flat().sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const go = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelected(null);
  };

  const openAdd = (day: number) => {
    const key = localDateKey(new Date(year, month, day));
    setSelected(key);
    setTitle("");
    setError(null);
  };

  async function submit() {
    if (!selected || !title.trim()) return;
    setSaving(true);
    setError(null);
    const res = await addCalendarEvent({ title: title.trim(), date: selected, color });
    setSaving(false);
    if (res.ok) {
      setSelected(null);
    } else {
      setError(res.error ?? "Eroare.");
    }
  }

  async function remove(id: string) {
    await deleteCalendarEvent(id);
  }

  return (
    <WidgetShell
      title="Calendar"
      icon={<CalendarDays className="h-4 w-4 text-accent" />}
      className="h-full"
      action={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Luna anterioară"
            className="flex h-7 w-7 items-center justify-center rounded-full text-subtle hover:bg-ink/5 hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Luna următoare"
            className="flex h-7 w-7 items-center justify-center rounded-full text-subtle hover:bg-ink/5 hover:text-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-bold text-ink">
          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </p>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={goToday}
            className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent hover:bg-accent/20"
          >
            Azi
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span
            key={i}
            className="text-[11px] font-extrabold uppercase text-subtle"
          >
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} className="h-9" aria-hidden />;
          const key = localDateKey(new Date(year, month, day));
          const isToday = key === todayKey;
          const dayEvents = eventsByDay.get(key) ?? [];
          const selectedDate = key === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => openAdd(day)}
              aria-label={`Adaugă eveniment pe ${day}`}
              className={cn(
                "relative flex h-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                isToday
                  ? "bg-accent text-white"
                  : selectedDate
                    ? "bg-accent/15 text-accent"
                    : "text-ink/80 hover:bg-ink/5"
              )}
            >
              {day}
              {dayEvents.length > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span
                      key={j}
                      className="h-1 w-1 rounded-full"
                      style={{ background: ev.color ?? KIND_COLORS[ev.kind] }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="inset mt-3 rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-ink">
              Eveniment pe{" "}
              {new Date(selected + "T00:00:00").toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "long",
              })}
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Închide"
              className="flex h-6 w-6 items-center justify-center rounded-full text-subtle hover:bg-card hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ce ai de făcut?"
            className="w-full rounded-lg border border-feather bg-card px-3 py-2 text-sm font-semibold text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Culoare ${c}`}
                  className={cn(
                    "h-5 w-5 rounded-full transition-transform",
                    color === c && "scale-110 ring-2 ring-ink/20"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !title.trim()}
              className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? "Se adaugă…" : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Adaugă
                </>
              )}
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        </div>
      )}

      <div className="mt-3 flex-1 space-y-1.5">
        {monthEvents.length === 0 && (
          <p className="rounded-xl bg-ink/5 px-3 py-2.5 text-xs font-semibold text-subtle">
            Nicio activitate în această lună. Atinge o zi pentru a adăuga.
          </p>
        )}
        {monthEvents.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${ev.color ?? KIND_COLORS[ev.kind]}22` }}
            >
              {ev.kind === "ACHIEVEMENT" ? (
                <Trophy className="h-3.5 w-3.5 text-success" />
              ) : ev.kind === "EXAM" ? (
                <GraduationCap className="h-3.5 w-3.5" style={{ color: ev.color ?? KIND_COLORS[ev.kind] }} />
              ) : (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: ev.color ?? KIND_COLORS[ev.kind] }}
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-ink">{ev.title}</p>
              <p className="text-[10px] font-semibold text-subtle">
                {new Date(ev.date).toLocaleDateString("ro-RO", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            {ev.kind === "USER" && (
              <button
                type="button"
                onClick={() => remove(ev.id)}
                aria-label="Șterge evenimentul"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-subtle hover:bg-card hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}
