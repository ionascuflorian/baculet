"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
  type PointerSensorOptions,
  type Sensors,
} from "@dnd-kit/dom";
import { GripVertical, Move, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_WEIGHT,
  type DashboardPrefs,
  type WidgetId,
} from "@/lib/dashboard-widgets";
import { saveDashboardWidgets } from "@/lib/actions/dashboard";

export interface DashboardWidgetNode {
  id: WidgetId;
  node: ReactNode;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function useColumns(): number {
  const isLg = useMediaQuery("(min-width: 1024px)");
  const isMd = useMediaQuery("(min-width: 640px)");
  return isLg ? 3 : isMd ? 2 : 1;
}

/** Detectează interacțiunea tactilă prin mai multe semnale, ca să nu depindem de unul singur. */
function useIsTouch(): boolean {
  const coarse = useMediaQuery("(pointer: coarse)");
  const anyCoarse = useMediaQuery("(any-pointer: coarse)");
  const noHover = useMediaQuery("(hover: none)");
  const anyNoHover = useMediaQuery("(any-hover: none)");
  const [capability, setCapability] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setCapability(
        typeof window !== "undefined" &&
          (navigator.maxTouchPoints > 0 || "ontouchstart" in window)
      );
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return coarse || anyCoarse || noHover || anyNoHover || capability;
}

function packColumns(ids: WidgetId[], columns: number): WidgetId[][] {
  const cols: { ids: WidgetId[]; weight: number }[] = Array.from(
    { length: columns },
    () => ({ ids: [], weight: 0 })
  );
  for (const id of ids) {
    let best = 0;
    for (let i = 1; i < columns; i++) {
      if (cols[i].weight < cols[best].weight) best = i;
    }
    cols[best].ids.push(id);
    cols[best].weight += WIDGET_WEIGHT[id] ?? 1;
  }
  return cols.map((c) => c.ids);
}

function recordFromColumns(columns: WidgetId[][]): Record<string, WidgetId[]> {
  return Object.fromEntries(columns.map((ids, i) => [String(i), ids]));
}

function flattenRecord(record: Record<string, WidgetId[]>): WidgetId[] {
  return Object.keys(record)
    .sort()
    .flatMap((key) => record[key]);
}

function columnOf(
  record: Record<string, WidgetId[]>,
  id: WidgetId
): string | null {
  for (const [key, list] of Object.entries(record)) {
    if (list.includes(id)) return key;
  }
  return null;
}

/**
 * Mutare în interiorul unei coloane sau între coloane, bazată pe ținta
 * (card sau placeholder de coloană goală). Fără OptimisticSortingPlugin —
 * reordonarea e pur React state, deci nu intră în conflict cu DOM-ul.
 */
function applyTarget(
  record: Record<string, WidgetId[]>,
  sourceId: WidgetId,
  target: string
): Record<string, WidgetId[]> {
  if (target.startsWith("empty:")) {
    const colKey = target.slice("empty:".length);
    const srcKey = columnOf(record, sourceId);
    if (srcKey === null || srcKey === colKey) return record;
    const next = { ...record };
    next[srcKey] = next[srcKey].filter((id) => id !== sourceId);
    next[colKey] = [...next[colKey], sourceId];
    return next;
  }

  const targetId = target as WidgetId;
  const srcKey = columnOf(record, sourceId);
  const tgtKey = columnOf(record, targetId);
  if (srcKey === null || tgtKey === null) return record;
  const srcIndex = record[srcKey].indexOf(sourceId);
  const tgtIndex = record[tgtKey].indexOf(targetId);
  if (srcKey === tgtKey && srcIndex === tgtIndex) return record;

  if (srcKey === tgtKey) {
    const list = [...record[srcKey]];
    list.splice(srcIndex, 1);
    const overIndex = list.indexOf(targetId);
    const insertAt = Math.max(0, overIndex + (srcIndex < tgtIndex ? 1 : 0));
    list.splice(insertAt, 0, sourceId);
    return { ...record, [srcKey]: list };
  }

  const next = { ...record };
  next[srcKey] = next[srcKey].filter((id) => id !== sourceId);
  const tgtList = [...record[tgtKey]];
  tgtList.splice(tgtIndex, 0, sourceId);
  next[tgtKey] = tgtList;
  return next;
}

function SortableWidget({
  id,
  index,
  children,
  editMode,
  onEnterEditMode,
}: {
  id: WidgetId;
  index: number;
  children: ReactNode;
  editMode: boolean;
  onEnterEditMode: () => void;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isTouch = useIsTouch();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  // NOTĂ: opțiunea `sensors` a lui useSortable e IGNORATĂ în dnd-kit v0.5.0
  // (valoarea inițială e aruncată în constructorul Sortable, iar schimbările
  // nu sunt reactive). Senzorii reali se setează la nivel de DragDropProvider
  // printr-un array STABIL, iar modul (touch/desktop/editare) se aplică dinamic
  // prin constrângerile de activare din DashboardGrid.
  const { ref, isDragging } = useSortable({
    id,
    index,
    handle: isTouch ? undefined : handleRef,
    plugins: [SortableKeyboardPlugin],
    transition: null,
  });

  useEffect(() => {
    if (editMode) clearPressTimer();
  }, [editMode, clearPressTimer]);

  useEffect(
    () => () => {
      if (pressTimer.current !== null) clearTimeout(pressTimer.current);
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTouch || editMode) return;
    const target = e.target as HTMLElement;
    // dnd-kit pune role="button" pe wrapper-ul draggable; ignorăm doar
    // elementele interactive aflate STRICT în interiorul cardului.
    const interactive = target.closest(
      "button, a, input, textarea, select, label, [role='button']"
    );
    if (interactive && interactive !== e.currentTarget) {
      return;
    }
    clearPressTimer();
    movedRef.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      onEnterEditMode();
    }, 1500);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pressStart.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (Math.hypot(dx, dy) > 12) {
      movedRef.current = true;
      clearPressTimer();
    }
  };

  const handlePointerUp = () => {
    pressStart.current = null;
    movedRef.current = false;
    clearPressTimer();
  };

  const handlePointerCancel = () => {
    // Fără mișcare înainte de cancel (ex. emulare/scroll takeover fără deplasare),
    // continuăm numărarea — altfel long-press-ul n-ar intra niciodată în editare.
    if (movedRef.current) handlePointerUp();
  };

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerUp}
      onContextMenu={isTouch ? (e) => e.preventDefault() : undefined}
      className={cn(
        "group relative",
        isTouch && "select-none [&_input]:select-text [&_textarea]:select-text",
        isDragging && "opacity-60",
        isTouch &&
          editMode &&
          !isDragging &&
          "widget-edit-wiggle rounded-[1.25rem] ring-2 ring-accent/60"
      )}
    >
      {isTouch && editMode && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-6 items-center justify-center rounded-t-[1.25rem] text-accent">
          <span className="flex items-center gap-0.5 rounded-full bg-background/90 px-2 py-0.5 shadow-sm ring-1 ring-accent/40">
            <GripVertical className="h-3.5 w-3.5" />
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
      {!isTouch && (
        <div
          ref={handleRef}
          role="button"
          aria-label="Muta widget-ul"
          className="absolute inset-x-0 top-0 z-20 flex h-6 cursor-grab items-center justify-center rounded-t-[1.25rem] text-subtle opacity-0 transition-opacity hover:text-accent active:cursor-grabbing group-hover:opacity-100"
        >
          <span className="flex items-center gap-0.5 rounded-full bg-background/90 px-2 py-0.5 shadow-sm ring-1 ring-feather">
            <GripVertical className="h-3.5 w-3.5" />
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

function EmptyColumnTarget({ columnKey }: { columnKey: string }) {
  const { ref, isDropTarget } = useDroppable({ id: "empty:" + columnKey });
  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-28 items-center justify-center rounded-[1.25rem] border-2 border-dashed px-4 py-8 text-sm font-bold transition-colors",
        isDropTarget
          ? "border-accent bg-accent/5 text-accent"
          : "border-feather text-subtle"
      )}
    >
      Trage aici
    </div>
  );
}

export function DashboardGrid({
  prefs,
  children,
}: {
  prefs: DashboardPrefs;
  children: DashboardWidgetNode[];
}) {
  const columns = useColumns();
  const isTouch = useIsTouch();
  const [editMode, setEditMode] = useState(false);
  const editSnapshot = useRef<Record<string, WidgetId[]> | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Când intrăm în mod editare, aducem bara Salvează/Anulează pe ecran
  // (utilizatorul poate ține apăsat pe un widget aflat mai jos în pagină).
  useEffect(() => {
    if (isTouch && editMode) {
      const id = setTimeout(() => {
        toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return () => clearTimeout(id);
    }
  }, [isTouch, editMode]);

  const idSetKey = useMemo(
    () => children.map((c) => c.id).sort().join(","),
    [children]
  );

  const [colState, setColState] = useState<Record<string, WidgetId[]>>(() =>
    recordFromColumns(packColumns(children.map((c) => c.id), columns))
  );

  const [activeId, setActiveId] = useState<WidgetId | null>(null);

  // În dnd-kit v0.5.0, modificările la `sensors` NU se propagă la draggable-urile
  // deja legate (nici per-useSortable, nici per-DragDropProvider: registry-ul
  // nu e reactiv și binding-ul se face o singură dată). De aceea array-ul de
  // senzori rămâne STABIL, iar constrângerile de activare sunt o FUNCȚIE care
  // citește modul curent (modeRef) la fiecare pointerdown — astfel scroll-ul pe
  // touch nu poate declanșa un drag, dar în mod editare drag-ul funcționează.
  const modeRef = useRef<"desktop" | "touch-edit" | "touch">("desktop");

  useEffect(() => {
    modeRef.current = isTouch ? (editMode ? "touch-edit" : "touch") : "desktop";
  }, [isTouch, editMode]);

  const pointerSensorOptions: PointerSensorOptions = {
    activationConstraints: () => {
      const mode = modeRef.current;
      if (mode === "touch") {
        // Practic niciodată: apăsare 60s cu toleranță uriașă.
        return [
          new PointerActivationConstraints.Delay({
            value: 60_000,
            tolerance: 1000,
          }),
        ];
      }
      if (mode === "touch-edit") {
        return [
          new PointerActivationConstraints.Delay({
            value: 250,
            tolerance: 10,
          }),
        ];
      }
      return [new PointerActivationConstraints.Distance({ value: 5 })];
    },
  };

  const dragSensors: Sensors = [
    {
      plugin: PointerSensor,
      options: pointerSensorOptions,
    },
    { plugin: KeyboardSensor },
  ];

  const nodeById = useMemo(() => {
    const map = new Map<WidgetId, ReactNode>();
    for (const c of children) map.set(c.id, c.node);
    return map;
  }, [children]);

  const visibleSet = useMemo(
    () => new Set(children.map((c) => c.id)),
    [children]
  );

  // Reconciliere la schimbarea nr. de coloane sau a widgeturilor vizibile.
  const [prevDeps, setPrevDeps] = useState("");
  const reconcileKey = `${idSetKey}:${columns}`;
  useEffect(() => {
    if (prevDeps === reconcileKey) return;
    setPrevDeps(reconcileKey);
    setColState((prev) => {
      const currentIds = new Set(children.map((c) => c.id));
      const flat = flattenRecord(prev).filter((id) => currentIds.has(id));
      const missing = children
        .map((c) => c.id)
        .filter((id) => !flat.includes(id));
      return recordFromColumns(packColumns([...flat, ...missing], columns));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconcileKey]);

  const enterEditMode = useCallback(() => {
    editSnapshot.current = colState;
    setEditMode(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }
  }, [colState]);

  const exitEditMode = useCallback(
    (save: boolean) => {
      if (save) {
        const order = flattenRecord(colState);
        const hidden = prefs.order.filter((id) => !visibleSet.has(id));
        void saveDashboardWidgets({
          order: [...order, ...hidden],
          hidden: prefs.hidden,
        });
      } else if (editSnapshot.current !== null) {
        setColState(editSnapshot.current);
      }
      editSnapshot.current = null;
      setEditMode(false);
    },
    [colState, prefs, visibleSet]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.operation.source?.id as WidgetId | undefined ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.operation.canceled) return;
    const source = event.operation.source;
    const target = event.operation.target;
    if (!source || !target) return;
    const sourceId = source.id as WidgetId;
    const next = applyTarget(colState, sourceId, String(target.id));
    if (next !== colState) setColState(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (event.canceled) return;
    const source = event.operation.source;
    const target = event.operation.target;
    if (!source || !target) return;
    const sourceId = source.id as WidgetId;
    const next = applyTarget(colState, sourceId, String(target.id));
    if (next !== colState) {
      setColState(next);
      // Pe mobil salvăm doar la „Salvează" (după confirmare), nu la drop.
      if (!(isTouch && editMode)) {
        const order = flattenRecord(next);
        const hidden = prefs.order.filter((id) => !visibleSet.has(id));
        void saveDashboardWidgets({
          order: [...order, ...hidden],
          hidden: prefs.hidden,
        });
      }
    }
  };

  return (
    <DragDropProvider
      sensors={dragSensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {isTouch && editMode && (
        <div
          ref={toolbarRef}
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-accent/40 bg-accent/5 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-accent">
            <Move className="size-4" />
            Mod editare — trage widgeturile în poziția dorită
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exitEditMode(false)}
              className="flex items-center gap-1.5 rounded-full bg-ink/5 px-4 py-2 text-sm font-bold text-subtle transition hover:bg-ink/10 hover:text-ink"
            >
              <X className="size-4" /> Anulează
            </button>
            <button
              onClick={() => exitEditMode(true)}
              className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
            >
              <Check className="size-4" /> Salvează
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        {Object.keys(colState)
          .sort()
          .map((key) => (
            <div key={key} className="flex min-w-0 flex-1 flex-col gap-5">
              {colState[key].length === 0 ? (
                <EmptyColumnTarget columnKey={key} />
              ) : (
                colState[key].map((id, index) => (
                  <SortableWidget
                    key={id}
                    id={id}
                    index={index}
                    editMode={editMode}
                    onEnterEditMode={enterEditMode}
                  >
                    {nodeById.get(id)}
                  </SortableWidget>
                ))
              )}
            </div>
          ))}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="pointer-events-none">
            {nodeById.get(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DragDropProvider>
  );
}
