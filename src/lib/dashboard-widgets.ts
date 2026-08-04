export type WidgetId =
  | "greeting"
  | "bac"
  | "weather"
  | "calendar"
  | "resume";

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  defaultVisible: boolean;
  defaultSize: "full" | "third" | "half";
}

export const WIDGETS: WidgetMeta[] = [
  {
    id: "greeting",
    label: "Salut",
    description: "Mesaj de bun venit cu numele tău: Bună ziua, {nume}.",
    defaultVisible: true,
    defaultSize: "full",
  },
  {
    id: "bac",
    label: "Countdown BAC",
    description: "Câte zile mai sunt până la prima probă a BAC-ului.",
    defaultVisible: true,
    defaultSize: "third",
  },
  {
    id: "weather",
    label: "Vremea",
    description: "Temperatură și stare meteo pentru orașul tău.",
    defaultVisible: true,
    defaultSize: "third",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Calendar lunar cu ziua curentă evidențiată.",
    defaultVisible: true,
    defaultSize: "third",
  },
  {
    id: "resume",
    label: "Continuă învățatul",
    description: "Scurtătură către lecția de unde ai rămas.",
    defaultVisible: true,
    defaultSize: "half",
  },
];

export const DEFAULT_ORDER: WidgetId[] = WIDGETS.map((w) => w.id);

export type WidgetSize = "small" | "medium" | "large";

export const DEFAULT_WIDGET_SIZE: Record<WidgetId, WidgetSize> = {
  greeting: "medium",
  bac: "large",
  weather: "small",
  calendar: "small",
  resume: "medium",
};

export const SIZE_SPAN: Record<WidgetSize, string> = {
  small: "md:col-span-1",
  medium: "md:col-span-2",
  large: "md:col-span-3",
};

export interface DashboardPrefs {
  order: WidgetId[];
  hidden: WidgetId[];
  sizes?: Partial<Record<WidgetId, WidgetSize>>;
}

export const DEFAULT_PREFS: DashboardPrefs = {
  order: DEFAULT_ORDER,
  hidden: [],
  sizes: {},
};

function isWidgetSize(v: unknown): v is WidgetSize {
  return v === "small" || v === "medium" || v === "large";
}

export function widgetSize(
  prefs: DashboardPrefs,
  id: WidgetId
): WidgetSize {
  const size = prefs.sizes?.[id];
  return isWidgetSize(size) ? size : DEFAULT_WIDGET_SIZE[id];
}

export function normalizePrefs(raw: unknown): DashboardPrefs {
  const fallback: DashboardPrefs = {
    order: DEFAULT_ORDER,
    hidden: [],
    sizes: {},
  };
  if (!raw || typeof raw !== "object") return fallback;
  const p = raw as Partial<DashboardPrefs>;
  const order = Array.isArray(p.order)
    ? p.order.filter((id): id is WidgetId => WIDGETS.some((w) => w.id === id))
    : fallback.order;
  const hidden = Array.isArray(p.hidden)
    ? p.hidden.filter((id): id is WidgetId => WIDGETS.some((w) => w.id === id))
    : fallback.hidden;
  const sizes: Partial<Record<WidgetId, WidgetSize>> = {};
  if (p.sizes && typeof p.sizes === "object") {
    for (const w of WIDGETS) {
      const s = (p.sizes as Record<string, unknown>)[w.id];
      if (isWidgetSize(s)) sizes[w.id] = s;
    }
  }
  const missing = WIDGETS.filter((w) => !order.includes(w.id)).map((w) => w.id);
  return { order: [...order, ...missing], hidden, sizes };
}

export function visibleWidgets(prefs: DashboardPrefs): WidgetId[] {
  return normalizePrefs(prefs).order.filter((id) => !prefs.hidden.includes(id));
}
