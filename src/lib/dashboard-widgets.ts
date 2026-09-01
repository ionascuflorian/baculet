export type WidgetId =
  | "greeting"
  | "bac"
  | "weather"
  | "calendar"
  | "resume"
  | "weak"
  | "progress"
  | "recap"
  | "recent"
  | "pomodoro"
  | "todo"
  | "streaks"
  | "leaderboard";

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  defaultVisible: boolean;
}

export const WIDGETS: WidgetMeta[] = [
  {
    id: "greeting",
    label: "Salut",
    description: "Mesaj de bun venit cu numele tău: Bună ziua, {nume}.",
    defaultVisible: true,
  },
  {
    id: "bac",
    label: "Countdown BAC",
    description: "Câte zile mai sunt până la prima probă a BAC-ului.",
    defaultVisible: true,
  },
  {
    id: "weather",
    label: "Vremea",
    description: "Temperatură și stare meteo pentru orașul tău.",
    defaultVisible: true,
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Calendar lunar cu ziua curentă evidențiată.",
    defaultVisible: true,
  },
  {
    id: "resume",
    label: "Continuă învățatul",
    description: "Următorul pas recomandat plus progresul general.",
    defaultVisible: true,
  },
  {
    id: "weak",
    label: "Pentru tine",
    description: "Concepte unde ai întâmpinat dificultăți (mastery scăzut).",
    defaultVisible: true,
  },
  {
    id: "progress",
    label: "Progresul tău",
    description: "Mastery-ul mediu pe fiecare materie, ca procent.",
    defaultVisible: true,
  },
  {
    id: "recap",
    label: "Recapitulare",
    description: "Cardurile programate pentru recapitulare (spaced repetition).",
    defaultVisible: true,
  },
  {
    id: "recent",
    label: "Teste recente",
    description: "Ultimele teste date cu scorul obținut.",
    defaultVisible: true,
  },
  {
    id: "pomodoro",
    label: "Timer & Pomodoro",
    description: "Ceas în timp real plus cronometru pomodoro cu faze.",
    defaultVisible: true,
  },
  {
    id: "todo",
    label: "Sarcini",
    description: "Listă de sarcini cu checkbox și contor de rămase.",
    defaultVisible: true,
  },
  {
    id: "streaks",
    label: "Seria de studiu",
    description: "Heatmap cu zilele Arn care ai Arnv��E>at ETi motivaE>ie pentru a nu pierde seria.",
    defaultVisible: true,
  },
  {
    id: "leaderboard",
    label: "Clasament",
    description: "Top 3 prieteni dup�� XP ETi totalul t��u de puncte.",
    defaultVisible: true,
  },
];

export const DEFAULT_ORDER: WidgetId[] = WIDGETS.map((w) => w.id);

/**
 * Estimare a înălțimii relative a fiecărui widget, folosită ca să
 * împachetăm cardurile în coloane cât mai echilibrate (masonry).
 */
export const WIDGET_WEIGHT: Record<WidgetId, number> = {
  greeting: 2,
  bac: 1.6,
  weather: 2.6,
  calendar: 2.6,
  resume: 2.2,
  weak: 2.2,
  progress: 2,
  recap: 2.4,
  recent: 2.2,
  pomodoro: 2.6,
  todo: 2.4,
  streaks: 3,
  leaderboard: 2.8,
};

export interface DashboardPrefs {
  order: WidgetId[];
  hidden: WidgetId[];
}

export const DEFAULT_PREFS: DashboardPrefs = {
  order: DEFAULT_ORDER,
  hidden: [],
};

export function normalizePrefs(raw: unknown): DashboardPrefs {
  const fallback: DashboardPrefs = {
    order: DEFAULT_ORDER,
    hidden: [],
  };
  if (!raw || typeof raw !== "object") return fallback;
  const p = raw as Partial<DashboardPrefs>;
  const order = Array.isArray(p.order)
    ? p.order.filter((id): id is WidgetId => WIDGETS.some((w) => w.id === id))
    : fallback.order;
  const hidden = Array.isArray(p.hidden)
    ? p.hidden.filter((id): id is WidgetId => WIDGETS.some((w) => w.id === id))
    : fallback.hidden;
  const missing = WIDGETS.filter((w) => !order.includes(w.id)).map((w) => w.id);
  return { order: [...order, ...missing], hidden };
}

export function visibleWidgets(prefs: DashboardPrefs): WidgetId[] {
  return normalizePrefs(prefs).order.filter((id) => !prefs.hidden.includes(id));
}
