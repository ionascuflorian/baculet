import { prisma } from "@/lib/db";
import { bacExamsForYear } from "@/lib/exam-dates";

export interface BacExamEvent {
  date: string; // YYYY-MM-DD
  title: string;
}

export interface BacSchedule {
  year: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  nextSessionStartDate: string; // YYYY-MM-DD
  events: BacExamEvent[];
}

const SETTING_KEY = "bacSchedule";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  return (
    typeof s === "string" &&
    DATE_RE.test(s) &&
    !Number.isNaN(new Date(`${s}T00:00:00`).getTime())
  );
}

function earliest(exams: { date: string }[]): string | null {
  if (exams.length === 0) return null;
  return exams.reduce((a, b) => (a.date < b.date ? a : b)).date;
}

function latest(exams: { date: string }[]): string | null {
  if (exams.length === 0) return null;
  return exams.reduce((a, b) => (a.date > b.date ? a : b)).date;
}

function isValidEvent(e: unknown): e is BacExamEvent {
  if (!e || typeof e !== "object") return false;
  const o = e as Partial<BacExamEvent>;
  return (
    typeof o.date === "string" &&
    isValidDate(o.date) &&
    typeof o.title === "string" &&
    o.title.trim().length > 0
  );
}

function defaultSchedule(): BacSchedule {
  const now = new Date();
  const year = now.getFullYear();
  let exams = bacExamsForYear(year);
  if (exams.length === 0) exams = bacExamsForYear(year + 1);

  let nextExams = bacExamsForYear(year + 1);
  if (nextExams.length === 0) nextExams = bacExamsForYear(year + 2);

  return {
    year,
    startDate: earliest(exams) ?? "",
    endDate: latest(exams) ?? "",
    nextSessionStartDate: earliest(nextExams) ?? "",
    events: exams.map((e) => ({ date: e.date, title: e.title })),
  };
}

export async function getBacSchedule(): Promise<BacSchedule> {
  const def = defaultSchedule();
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    if (setting?.value && typeof setting.value === "object") {
      const v = setting.value as Partial<BacSchedule>;
      const year =
        typeof v.year === "number" && v.year >= 2000 && v.year <= 2100
          ? v.year
          : def.year;

      const events = Array.isArray(v.events)
        ? v.events.filter(isValidEvent).slice(0, 20)
        : def.events;

      return {
        year,
        startDate: isValidDate(v.startDate ?? "") ? v.startDate! : def.startDate,
        endDate: isValidDate(v.endDate ?? "") ? v.endDate! : def.endDate,
        nextSessionStartDate: isValidDate(v.nextSessionStartDate ?? "")
          ? v.nextSessionStartDate!
          : def.nextSessionStartDate,
        events,
      };
    }
  } catch {
    // fall through to defaults
  }
  return def;
}