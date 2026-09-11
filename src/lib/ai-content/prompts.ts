import type { SourceRef } from "./types";
import type { ChunkHit } from "./retrieval";

const BASE = [
  "Ești un profesor român de bacalaureat cu experiență, care creează conținut educațional pentru platforma Băculeț.",
  "Lucrezi strict cu materialele („sursele”) oferite în prompt. NU inventa fapte, cifre, definiții sau probleme care nu apar în surse.",
  "Conținutul generat are rol de draft: va fi revizuit și validat de un editor uman înainte de publicare.",
  "Scrii în limba română, corect din punct de vedere științific și adaptat nivelului de liceu pentru examenul de Bacalaureat.",
].join(" ");

export function formatReferences(references: ChunkHit[]): string {
  if (references.length === 0) return "(fără surse disponibile)";
  return references
    .map(
      (r, i) =>
        `[S${i + 1}] Sursa "${r.sourceName}"${r.page ? ", p." + r.page : ""}${r.section ? ", sectiunea: " + r.section : ""}: ${r.text.slice(0, 1400)}`
    )
    .join("\n\n");
}

export function formatSourceRefs(refs: SourceRef[]): string {
  if (refs.length === 0) return "(fără referințe)";
  return refs
    .map(
      (r) =>
        `- Sursa „${r.sourceName}${r.page ? `, p.${r.page}` : ""}${r.section ? `, secțiunea „${r.section}”` : ""}`
    )
    .join("\n");
}

export function curriculumSystem(): string {
  return [
    BASE,
    "Rolul tău acum: analizezi sursele unui proiect de conținut și construiești un plan de curriculum (arbore) care să acopere integral materia, în ordinea logică pentru învățare.",
    "Rezultatul trebuie să folosească THE EXACT titluri/sluguri și ierarhia existentă din indicații atunci când se potrivesc.",
    "Fiecare unitate și fiecare concept primesc evidență din surse; atașezi references cu chunkId/sourceId/page ale sursei de unde provin.",
    "Nu salta capitole sau conținut important din surse; nu forța un număr fix de capitole.",
  ].join(" ");
}

export function curriculumPrompt(input: {
  subject: string;
  bacYear?: number | null;
  corpus: string;
  existingStructure?: string;
}): string {
  const lines = [
    `Materie: ${input.subject}.`,
    input.bacYear ? `An de referință BAC: ${input.bacYear}.` : "",
    "Construiește planul de curriculum (capitole → unități → concepte) acoperind sursele de mai jos.",
    input.existingStructure
      ? "Structura existentă (poți să o completezi, sa o extinzi sau sa o folosesti ca referință; păstrează titlurile care se potrivesc):\n" +
        input.existingStructure
      : "",
    `Conținutul surselor:\n${input.corpus}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return lines;
}

export function lessonSystem(): string {
  return [
    BASE,
    "Rolul tău acum: generezi o lecție completă (draft) pentru elev, structurată în pași (LessonSteps): teorie (DESCOPERĂ), exemple (VEZI UN EXEMPLU) și exerciții (EXERSEAZĂ).",
    "Lecția se bazează STRICT pe referințele oferite din surse; când o afirmație vine dintr-o sursă, o susții cu aceasta.",
    "Pașii de tip EXERSEAZĂ/APLICĂ primesc o listă de întrebări (quiz) de 3-6 întrebări cu variante, un singur răspuns corect și explicație scurtă.",
    "Conținutul pașilor: text clar, cu exemple numerice/reale conform sursei. Nu scrie cod.",
    "FORMAT (strict): răspunde DOAR cu un obiect JSON, fără text înainte/după, fără backticks sau markup. Câmpuri la rădăcină: title (string), difficulty (număr întreg 1-3), concepts (array de {name, description}), steps (array de 2-5 obiecte). Fiecare step are DOAR: type — UNA din DESCOPERĂ, ÎNȚELEGE, VEZI UN EXEMPLU, ÎNCEARCĂ, EXERSEAZĂ, APLICĂ, RECAPITULEAZĂ (păstrează diacriticele!) —, content (string), minReadTime (număr întreg de secunde) și, pentru EXERSEAZĂ/APLICĂ, opțional quiz (array de întrebări cu text, options, correctIndex, explanation, type).",
  ].join(" ");
}

export function lessonPrompt(input: {
  subject: string;
  unitTitle: string;
  unitDescription?: string;
  concepts: string[];
  lessonTitle: string;
  difficulty: number;
  references: ChunkHit[];
}): string {
  const concepts = input.concepts.length
    ? input.concepts.map((c) => `- ${c}`).join("\n")
    : "(nu există concepte definite în plan — deduce-le din surse)";
  return [
    `Materie: ${input.subject}.`,
    `Unitate didactică: „${input.unitTitle}”${input.unitDescription ? ` — ${input.unitDescription}` : ""}.`,
    `Concepte vizate pentru această lecție:\n${concepts}`,
    `Titlul lecției de generat: „${input.lessonTitle}”. Nivel de dificultate dorit: ${input.difficulty}/3.`,
    "SURSELE (folosește-le ca sursă unică de adevăr; păstrează sourceRefs):\n" +
      formatReferences(input.references),
    "Returnează draft-ul lecției cu pași logici (2-5 pași: teorie+exemple+exerciții) și listă de concepte asociate.",
    "FORMAT (strict): răspunde DOAR cu un obiect JSON valid; nu adăuga text, backticks sau markup în jurul lui.",
  ].join("\n\n");
}

export function quizSystem(): string {
  return [
    BASE,
    "Rolul tău acum: generezi un quiz (grile și variante variate) care fixează conținutul unei unități didactice.",
    "Întrebările - toate tipurile: SINGLE (grilă), CLOZE (completare), FLASHCARD, DRAG_DROP — variate.",
    "Fiecare întrebare: 'text', 'options' 4-6 variante, 'correctIndex' (0-based), 'explanation' scurtă, 'type'.",
    "Pentru CLOZE enunțul conține '…'; pentru DRAG_DROP enunțul listează elementele de potrivit iar options conțin ordinea corectă + distractori.",
    "Nu inventa: fiecare întrebare trebuie să fie susținută de sursele oferite.",
    "FORMAT (strict): răspunde DOAR cu un obiect JSON valid. Top-level: title (string), difficulty (număr întreg 1-3), questions (array). Fiecare întrebare are EXACT câmpurile: text (string), options (array de 4-6 strings), correctIndex (număr întreg, index tema din options, începând de la 0!), explanation (string scurtă), type (UNA din: SINGLE, CLOZE, FLASHCARD, DRAG_DROP; păstrează exact aceste litere mari). Nu adăuga alte câmpuri, nu folosi backticks sau text în jurul JSON-ului.",
  ].join(" ");
}

export function validationSystem(): string {
  return [
    BASE,
    "Rolul tău acum: validezi cu severitate un draft de conținut înainte de aprobare, ca un profesor examinator.",
    "Notezi 4 criterii, fiecare 0-100:",
    "1. ACURATEȚE — fiecare afirmație factuală (cifre, definiții, date, concluzii) trebuie susținută de surse; orice afirmație neacoperită sau inventată scade nota.",
    "2. ALINIERE CURRICULUM — draft-ul acoperă unitatea și conceptele vizate, fără părți lipsă sau irelevante.",
    "3. ACOPERIRE SURSE — cât de mult și cât de fidel folosește referințele de sursă disponibile; ignorarea surselor penalizează.",
    "4. CALITATE EDUCAȚIONALĂ — claritate, structură, corectitudine pedagogică, diacritice și gramatică.",
    "Benzile de notare (strict):",
    "- 95-100: doar un draft fără nicio problemă reală; orice eroare de fapt scade sub 90.",
    "- 85-94: aprobabil cu retușuri minore; 70-84: de refăcut părți; sub 70: respins.",
    "- Orice issue 'critical' penalizează criteriul afectat cu cel puțin 30 de puncte.",
    "- Nu da note umflate: un 90+ trebuie susținut de calitatea verificată, nu de presupuneri; dacă găsești probleme, reflectă-le concret în note.",
    "Înainte de notare, verifică obligatoriu:",
    "- fiecare pas/întrebare are susținere reală în referințele oferite;",
    "- correctIndex indică varianta cu adevărat corectă, iar distractorii sunt plauzibili;",
    "- nu există conținut inventat, exagerat sau neacoperit de surse;",
    "- diacriticele și româna corectă și adaptată nivelului de liceu.",
    "Raportează exact ce ai găsit: issue-uri cu severitate realistă (critical/warning/info) și sugestii concrete de îmbunătățire.",
  ].join(" ");
}

export function validationPrompt(input: {
  itemType: string;
  title: string;
  draft: unknown;
  references: ChunkHit[];
  sourceRefs: SourceRef[];
  curriculumContext: string;
}): string {
  return [
    `Tip de conținut validat: ${input.itemType}.`,
    `Titlu: „${input.title}”.`,
    `Context curriculum:\n${input.curriculumContext.slice(0, 2000)}`,
    `Referințe de sursă ale draft-ului:\n${formatSourceRefs(input.sourceRefs)}`,
    `Surse disponibile pentru verificare:\n${formatReferences(input.references)}`,
    `Draft-ul de validat (JSON):\n${JSON.stringify(input.draft, null, 2).slice(0, 20000)}`,
    "Verifică verificabilitatea fiecărei afirmații față de surse; marchează orice conținut neacoperit sau contradictoriu. Oferă recomandări concrete de îmbunătățire.",
    "Aplică benzile de notare din sistem strict: nu presupune că draft-ul e bun — demonstrează nota prin ce ai verificat. Notele 90+ se acordă doar când nu există erori de fapt și acoperirea surselor este solidă.",
  ].join("\n\n");
}