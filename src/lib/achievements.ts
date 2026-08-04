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
  { key: "quiz:10", title: "Ai dat 10 teste", reached: (s) => s.quizCount >= 10 },
  { key: "quiz:100", title: "Ai dat 100 de teste", reached: (s) => s.quizCount >= 100 },
];

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