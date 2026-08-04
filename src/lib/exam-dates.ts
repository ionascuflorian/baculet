export interface BacExamDef {
  date: string; // YYYY-MM-DD
  title: string;
}

// Datele examenelor naționale de BAC, pe an, din calendarul oficial (edu.ro).
// Actualizează aici când sunt anunțate datele pentru un an viitor.
export const BAC_EXAMS_BY_YEAR: Record<number, BacExamDef[]> = {
  2026: [
    { date: "2026-06-08", title: "BAC 2026 — Competențe lingvistice română (proba A)" },
    { date: "2026-06-11", title: "BAC 2026 — Competențe lingvistice limbă străină (proba C)" },
    { date: "2026-06-15", title: "BAC 2026 — Competențe digitale (proba D)" },
    { date: "2026-06-29", title: "BAC 2026 — Limba și literatura română (proba E.a)" },
    { date: "2026-07-01", title: "BAC 2026 — Proba obligatorie a profilului (proba E.c)" },
    { date: "2026-07-02", title: "BAC 2026 — Proba la alegere (proba E.d)" },
    { date: "2026-07-03", title: "BAC 2026 — Limba și literatura maternă (proba E.b)" },
  ],
};

export function bacExamsForYear(year: number): BacExamDef[] {
  return BAC_EXAMS_BY_YEAR[year] ?? [];
}

export function firstExamOfYear(year: number): BacExamDef | null {
  const exams = bacExamsForYear(year);
  if (exams.length === 0) return null;
  return exams.reduce((a, b) => (a.date < b.date ? a : b));
}
