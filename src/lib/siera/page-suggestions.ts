export type SuggestionIcon =
  | "search"
  | "quiz"
  | "summary"
  | "concept"
  | "tips"
  | "progress";

export interface SieraSuggestion {
  label: string;
  message: string;
  icon: SuggestionIcon;
}

export interface SieraGreeting {
  title: string;
  text: string;
  suggestions: SieraSuggestion[];
}

const DEFAULT_GREETING: SieraGreeting = {
  title: "Sunt Siera, aici pentru tine.",
  text: "Pot să caut prin site, să rezum pagini, să explic concepte sau să generez teste grilă. Ce vrei să faci?",
  suggestions: [
    {
      label: "Generează un test grilă",
      message: "Generează un test grilă pentru mine",
      icon: "quiz",
    },
    { label: "Caută prin site", message: "Caută: derivate", icon: "search" },
    { label: "Explică-mi un concept", message: "Explică-mi conceptul de derivată", icon: "concept" },
    { label: "Sfaturi de învățare", message: "Cum învăț eficient pentru BAC?", icon: "tips" },
  ],
};

export function getSieraGreeting(pathname: string): SieraGreeting {
  const p = pathname || "/dashboard";

  const lesson = p.match(/^\/materii\/([^/]+)\/([^/]+)\/([^/]+)$/);
  if (lesson) {
    return {
      title: "Ești la o lecție — locul perfect să aprofundezi.",
      text: "Pot să te ajut să o înțelegi pe deplin:",
      suggestions: [
        { label: "Rezumă lecția curentă", message: "Rezumă lecția curentă", icon: "summary" },
        { label: "Explică un concept", message: "Explică-mi un concept din lecția curentă", icon: "concept" },
        { label: "Test pe această lecție", message: "Generează un test grilă pe lecția curentă", icon: "quiz" },
        { label: "Caută: formule", message: "Caută: formule", icon: "search" },
      ],
    };
  }

  const chapter = p.match(/^\/materii\/([^/]+)\/([^/]+)$/);
  if (chapter) {
    return {
      title: "Un capitol întreg de explorat.",
      text: "Îți propun câteva idei pentru sesiunea de azi:",
      suggestions: [
        { label: "Rezumă capitolul", message: "Rezumă capitolul curent", icon: "summary" },
        { label: "Test pe acest capitol", message: "Generează un test grilă pe capitolul curent", icon: "quiz" },
        { label: "Explică un concept", message: "Explică-mi un concept din acest capitol", icon: "concept" },
        { label: "Caută prin materie", message: "Caută: exemple", icon: "search" },
      ],
    };
  }

  const subject = p.match(/^\/materii\/([^/]+)$/);
  if (subject) {
    return {
      title: "Materie de BAC — bun material de lucru.",
      text: "Cum te ajut azi?",
      suggestions: [
        { label: "Rezumă pagina curentă", message: "Rezumă pagina curentă", icon: "summary" },
        { label: "Test la această materie", message: "Generează un test grilă la această materie", icon: "quiz" },
        { label: "Explică un concept", message: "Explică-mi un concept din această materie", icon: "concept" },
        { label: "Caută: lecții", message: "Caută: lecții", icon: "search" },
      ],
    };
  }

  if (p === "/dashboard") {
    return {
      title: "Bine ai revenit!",
      text: "Am pregătit câteva sugestii ca să începem bine sesiunea de azi:",
      suggestions: [
        {
          label: "Test grilă la matematică",
          message: "Generează un test grilă la matematică",
          icon: "quiz",
        },
        { label: "Caută: derivate", message: "Caută: derivate", icon: "search" },
        { label: "Explică-mi integrala", message: "Explică-mi cum se rezolvă o integrală", icon: "concept" },
        { label: "Plan de învățare", message: "Cum îmi organizez sesiunile de învățat?", icon: "tips" },
      ],
    };
  }

  if (p.startsWith("/subiecte-bac")) {
    return {
      title: "Subiectele de BAC — cheia examenului.",
      text: "Pot să te ajut să înțelegi structura și să te antrenezi:",
      suggestions: [
        { label: "Structura examenului", message: "Explică-mi structura examenului de bacalaureat", icon: "concept" },
        { label: "Test de antrenament", message: "Generează un test grilă de antrenament pentru BAC", icon: "quiz" },
        { label: "Caută: subiecte", message: "Caută: subiecte", icon: "search" },
        { label: "Cum mă pregătesc?", message: "Cum mă pregătesc eficient pentru examenul de BAC?", icon: "tips" },
      ],
    };
  }

  if (p.startsWith("/progres")) {
    return {
      title: "Analiza progresului e esențială.",
      text: "Îți las câteva idei pentru antrenament:",
      suggestions: [
        { label: "Test grilă la matematică", message: "Generează un test grilă la matematică", icon: "quiz" },
        { label: "Caută: formule", message: "Caută: formule", icon: "search" },
        { label: "Explică un concept", message: "Explică-mi conceptul de asimptotă", icon: "concept" },
        { label: "Ritm de învățat", message: "Cum îmi mențin ritmul de învățare?", icon: "progress" },
      ],
    };
  }

  const quiz = p.match(/^\/teste\/([^/]+)/);
  if (quiz) {
    return {
      title: "Un test de parcurs — hai să-l stăpânești.",
      text: "Ce pot face pentru tine:",
      suggestions: [
        { label: "Rezumă testul curent", message: "Rezumă testul curent", icon: "summary" },
        { label: "Alt test similar", message: "Generează un alt test grilă similar", icon: "quiz" },
        { label: "Explică un concept", message: "Explică-mi un concept legat de acest test", icon: "concept" },
        { label: "Caută în materie", message: "Caută: lecția cu explicații", icon: "search" },
      ],
    };
  }

  return DEFAULT_GREETING;
}
