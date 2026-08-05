"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  type Sensors,
} from "@dnd-kit/dom";
import { GripVertical } from "lucide-react";
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

/** Ecran tactil: long-press pe card pornește drag-ul. */
function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
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
}: {
  id: WidgetId;
  index: number;
  children: ReactNode;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const coarse = useCoarsePointer();

  const { ref, isDragging } = useSortable({
    id,
    index,
    handle: coarse ? undefined : handleRef,
    sensors: coarse
      ? ([
          {
            plugin: PointerSensor,
            options: {
              activationConstraints: [
                new PointerActivationConstraints.Delay({
                  value: 220,
                  tolerance: 10,
                }),
              ],
            },
          },
          { plugin: KeyboardSensor },
        ] satisfies Sensors)
      : ([
          {
            plugin: PointerSensor,
            options: {
              activationConstraints: [
                new PointerActivationConstraints.Distance({ value: 5 }),
              ],
            },
          },
          { plugin: KeyboardSensor },
        ] satisfies Sensors),
    plugins: [SortableKeyboardPlugin],
    transition: null,
  });

  return (
    <div ref={ref} className={cn("group relative", isDragging && "opacity-60")}>
      {!coarse && (
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

  const idSetKey = useMemo(
    () => children.map((c) => c.id).sort().join(","),
    [children]
  );

  const [colState, setColState] = useState<Record<string, WidgetId[]>>(() =>
    recordFromColumns(packColumns(children.map((c) => c.id), columns))
  );

  const [activeId, setActiveId] = useState<WidgetId | null>(null);

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
  if (prevDeps !== reconcileKey) {
    setPrevDeps(reconcileKey);
    setColState((prev) => {
      const currentIds = new Set(children.map((c) => c.id));
      const flat = flattenRecord(prev).filter((id) => currentIds.has(id));
      const missing = children
        .map((c) => c.id)
        .filter((id) => !flat.includes(id));
      return recordFromColumns(packColumns([...flat, ...missing], columns));
    });
  }

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
      const order = flattenRecord(next);
      const hidden = prefs.order.filter((id) => !visibleSet.has(id));
      void saveDashboardWidgets({
        order: [...order, ...hidden],
        hidden: prefs.hidden,
      });
    }
  };

  return (
    <DragDropProvider
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        {Object.keys(colState)
          .sort()
          .map((key) => (
            <div key={key} className="flex min-w-0 flex-1 flex-col gap-5">
              {colState[key].length === 0 ? (
                <EmptyColumnTarget columnKey={key} />
              ) : (
                colState[key].map((id, index) => (
                  <SortableWidget key={id} id={id} index={index}>
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
