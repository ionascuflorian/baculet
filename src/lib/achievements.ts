export interface AchievementStats {
  streakCount: number;
  lessonsDone: number;
  quizCount: number;
}

interface Milestone {
  key: string;
  title: string;
  reached: (s: AchievementStats) => boolean;
}

const MILESTONES: Milestone[] = [
  { key: "streak:7", title: "7 zile de focus la rând", reached: (s) => s.streakCount >= 7 },
  { key: "streak:30", title: "30 de zile de focus la rând", reached: (s) => s.streakCount >= 30 },
  { key: "streak:100", title: "100 de zile de focus la rând", reached: (s) => s.streakCount >= 100 },
  { key: "streak:365", title: "Un an de focus!", reached: (s) => s.streakCount >= 365 },
  { key: "lessons:10", title: "Ai parcurs 10 lecții", reached: (s) => s.lessonsDone >= 10 },
  { key: "lessons:25", title: "Ai parcurs 25 de lecții", reached: (s) => s.lessonsDone >= 25 },
  { key: "lessons:50", title: "50 lecții — erudit", reached: (s) => s.lessonsDone >= 50 },
  { key: "quiz:10", title: "Ai dat 10 teste", reached: (s) => s.quizCount >= 10 },
  { key: "quiz:50", title: "50 teste — maestru", reached: (s) => s.quizCount >= 50 },
  { key: "quiz:100", title: "Ai dat 100 de teste", reached: (s) => s.quizCount >= 100 },
  { key: "steps:50", title: "50 pași parcurși", reached: (s) => (s as unknown as { stepsDone: number }).stepsDone >= 50 },
];

export interface Badge {
  key: string;
  title: string;
  icon: string;
  earned: boolean;
}

export function allBadges(stats: AchievementStats & { stepsDone?: number; chaptersDone?: number }): Badge[] {
  const defs: Omit<Badge, "earned">[] = [
    { key: "streak:7", title: "Săptămâna de foc", icon: "🔥" },
    { key: "streak:30", title: "Luna de focus", icon: "🏆" },
    { key: "streak:100", title: "Centurion", icon: "💎" },
    { key: "lessons:10", title: "Explorator", icon: "📚" },
    { key: "lessons:25", title: "Cărturar", icon: "🎓" },
    { key: "lessons:50", title: "Erudit", icon: "🧠" },
    { key: "quiz:10", title: "Începător curajos", icon: "✍️" },
    { key: "quiz:50", title: "Maestru teste", icon: "⚔️" },
    { key: "steps:50", title: "Maratonist pași", icon: "👣" },
  ];
  return defs.map((d) => ({
    ...d,
    earned: MILESTONES.find((m) => m.key === d.key)?.reached(stats as AchievementStats) ?? false,
  }));
}

export const ACHIEVEMENT_COLOR = "#34c759";
export const EXAM_COLOR = "#0a7cff";

export interface ReasonedEvent {
  key: string;
  title: string;
  kind: "ACHIEVEMENT" | "EXAM";
  color?: string | null;
}

export function achievementEvents(stats: AchievementStats): ReasonedEvent[] {
  return MILESTONES.filter((m) => m.reached(stats)).map((m) => ({
    key: `achievement:${m.key}`,
    title: m.title,
    kind: "ACHIEVEMENT",
    color: ACHIEVEMENT_COLOR,
  }));
}