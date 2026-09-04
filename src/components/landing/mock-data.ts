export interface DemoQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const demoQuestions: DemoQuestion[] = [
  {
    id: "q1",
    text:
      'În poemul „Luceafărul” de Mihai Eminescu, Luceafărul funcționează în principal ca:',
    options: [
      "o alegorie a zorilor",
      "simbol al geniului și al aspirației spre absolut",
      "personificare a nopții",
      "metaforă a mării",
    ],
    correct: 1,
    explanation:
      "Luceafărul — ca și Hyperion, ipostaza lui din mit — este simbolul geniului: perfect, nemuritor, dar condamnat la singurătate. Nu poate iubi „chipul de lut”, iar finalul poeziei subliniază acceptarea singurătății ca preț al absolutului.",
  },
  {
    id: "q2",
    text: "Dacă f: ℝ → ℝ, f(x) = x² − 4x + 3, atunci f(0) este egal cu:",
    options: ["0", "−4", "3", "−3"],
    correct: 2,
    explanation:
      "Înlocuim x cu 0: f(0) = 0² − 4·0 + 3 = 3. Graficul funcției intersectează axa Oy în punctul (0, 3).",
  },
  {
    id: "q3",
    text: "Tema centrală a romanului „Moromeții” de Marin Preda este:",
    options: [
      "căderea și transformarea satului românesc sub presiunea istoriei",
      "viața intelectualilor interbelici",
      "marea migrație din anii ’70",
      "conflictul dintre generații în oraș",
    ],
    correct: 0,
    explanation:
      "Primul volum surprinde lumea satului înainte de instaurarea comunismului, iar al doilea destrămarea ei. Ilie Moromete este țăranul care rezistă timpului prin filozofia lui despre lume, dar nu rezistă istoriei.",
  },
  {
    id: "q4",
    text: "Transportul oxigenului în sânge este realizat de:",
    options: ["trombocite", "leucocite", "hemoglobina din eritrocite", "plasma sanguină"],
    correct: 2,
    explanation:
      "Hemoglobina din globulele roșii leagă oxigenul la nivelul plămânilor și îl eliberează în țesuturi. Trombocitele participă la coagulare, iar leucocitele la apărare.",
  },
];

export interface SieraTopic {
  id: string;
  label: string;
  answer: string;
}

export const sieraTopics: SieraTopic[] = [
  {
    id: "rezumat",
    label: "Rezumat la „Luceafărul”",
    answer:
      "„Luceafărul” (1883) e capodopera poetică a lui Eminescu: Cătălina respinge iubirea omenească a tânărului Hyperion și visează la Luceafăr. În final, Luceafărul renunță la ea — „Ce-ți pasă ție, chip de lut, / Dac-oi fi eu sau altul?” — și își acceptă nemurirea în singurătate. E simbolul geniului: perfect, dar condamnat să nu fie iubit. Vrei și comentariul pe strofe?",
  },
  {
    id: "functii",
    label: "Explică-mi funcția liniară",
    answer:
      "O funcție liniară are forma f(x) = ax + b, cu a ≠ 0, iar graficul ei e o dreaptă. Panta a arată înclinația: a > 0 → funcția crește, a < 0 → descrește. Punctul de intersecție cu axa Oy este (0, b). Exemplu: f(x) = 2x − 1 trece prin (0, −1) și are panta 2. Îți dau și un exercițiu rezolvat, dacă vrei!",
  },
  {
    id: "test",
    label: "Test grilă rapid",
    answer:
      "Ți-am pregătit 5 întrebări din programa de BAC, cu explicații la fiecare răspuns. Ai 10 minute la dispoziție — exact ca la examen. Găsești totul în pagina Teste, iar scorul ți se salvează automat în cont. Mult succes! 💪",
  },
];

export const sieraGeneric: string[] = [
  "Bună idee! Am reținut întrebarea ta. Pe site, Siera îți răspunde instant, cu trimiteri directe la lecții și module — aici e doar o demonstrație.",
  "Interesant! Încearcă să-mi pui o întrebare din sugestiile de mai sus ca să vezi cum funcționează conversația cu Siera.",
  "Hmm, întrebare bună! Pe site îți răspund cu exemple din lecții și cu trimiteri exacte la module. Aici e doar o demonstrație — încearcă sugestiile de mai jos ca să vezi cum merge.",
];

export interface DemoBoardRow {
  id: string;
  name: string;
  username: string;
  xp: number;
  mine?: boolean;
}

export const demoBoard: DemoBoardRow[] = [
  { id: "u1", name: "Andrei Popescu", username: "andrei", xp: 12840 },
  { id: "u2", name: "Ioana Dobre", username: "ioana", xp: 11950 },
  { id: "u3", name: "Radu Ionescu", username: "radu", xp: 11020 },
  { id: "u4", name: "Maria Stan", username: "maria", xp: 8350, mine: true },
  { id: "u5", name: "Teo Marin", username: "teo", xp: 7900 },
  { id: "u6", name: "Vlad Costache", username: "vlad", xp: 6410 },
  { id: "u7", name: "Ana Tudor", username: "ana", xp: 5230 },
];

export const demoSubjects = [
  { name: "Limba română", pct: 45, color: "bg-accent" },
  { name: "Matematică", pct: 30, color: "bg-brand-dark" },
  { name: "Biologie", pct: 70, color: "bg-success" },
];

export function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}z ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function demoActivities(today: Date, weeksBack = 20): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = weeksBack * 7; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const r = seeded(key.length * 31 + key.charCodeAt(0) + key.charCodeAt(4) + i * 13);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    if (r < 0.2) continue;
    const count = r < 0.45 ? 1 : r < 0.7 ? 2 : r < 0.9 ? 4 : 8;
    if (!weekend && count === 1) map.set(key, 2);
    else map.set(key, count);
  }
  return map;
}
