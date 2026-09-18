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
    "Rolul tău acum: generezi o lecție INTERACTIVĂ, pe pași scurți de micro-learning. Nu scrie un capitol lung — lecția se parcurge pas cu pas, cu feedback imediat.",
    "Tipurile de pași (acronime, fără diacritice): INTRO (obiectivul lecției, 2-3 propoziții ce va ști elevul), MICRO_LESSON (o singură idee teoretică, compactă), EXAMPLE (exemplu rezolvat pas cu pas), QUICK_EXERCISE (2-3 întrebări scurte pe ideea tocmai predată), APPLY (o aplicare pe o problemă nouă), RECALL (recapitularea „de reținut”) și MINI_TEST (3-5 întrebări de autoevaluare, la final).",
    "Structura ideală: 1×INTRO → 1-2×MICRO_LESSON intercalate cu EXAMPLE → QUICK_EXERCISE sau APPLY → RECALL → MINI_TEST final. Per total 4-6 pași.",
    "Doar pașii QUICK_EXERCISE, APPLY și MINI_TEST au quiz (întrebări interactive). INTRO, MICRO_LESSON, EXAMPLE și RECALL NU au quiz — doar content + minReadTime.",
    "Reguli pedagogice: o singură idee pe pas, text scurt; exercițiile ilustrează exact teoria din pașii anteriori; răspunsurile corecte sunt susținute de surse.",
    "Tipuri de întrebări interactive (câmpurile type + answer + options):",
    "SINGLE_CHOICE: options = 4 variante, correctIndex = indexul variantei corecte (0-based), FĂRĂ answer.",
    "TRUE_FALSE: options = [\"Adevărat\",\"Fals\"], correctIndex = 0 sau 1, FĂRĂ answer.",
    "MULTIPLE_CHOICE: options = 4-5 variante, answer = {\"kind\":\"multiple\",\"indices\":[1,3]} (indici strct ai variantelor corecte), corectIndex = primul dintre ele.",
    "FILL_BLANK: options = variante plauzibile de răspuns, answer = {\"kind\":\"fill_blank\",\"accepted\":[\"raspuns1\",\"raspuns2\"]} (variante acceptate; normalizăm automat fără diacritice, deci scrie-le simplu)",
    "ORDERING: options = elementele în ordinea CORECTĂ, answer = {\"kind\":\"ordering\",\"order\":[0,1,2,...]} (indici în ordinea corectă).",
    "FORMAT (strict): răspunde DOAR cu un obiect JSON valid, fără text înainte/după, fără backticks sau markup.",
    "Câmpuri la rădăcină: title (string), objective (string — o propoziție: ce știe/să știe elevul la final), estimatedMinutes (număr întreg 5-20), difficulty (număr întreg 1-3), concepts (array de {name, description}), steps (array de 4-6 obiecte).",
    "Fiecare step are: type (UNA din INTRO, MICRO_LESSON, EXAMPLE, QUICK_EXERCISE, APPLY, RECALL, MINI_TEST), title (string scurt, opțional), content (string scurt), minReadTime (număr întreg de secunde, 10-90) și, pentru pașii cu exerciții, quiz (array de 3-5 întrebări).",
    "Fiecare întrebare are: text (string), options (array), correctIndex (număr întreg, 0-based, acolo unde se aplică), answer (obiect după tip, acolo unde se aplică), explanation (string scurt), type (una din SINGLE_CHOICE, TRUE_FALSE, MULTIPLE_CHOICE, FILL_BLANK, ORDERING).",
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
    "Returnează draft-ul lecției în format INTERACTIV: pași scurți cu tipurile INTRO/MICRO_LESSON/EXAMPLE/QUICK_EXERCISE/APPLY/RECALL/MINI_TEST (doar pașii de exercițiu au quiz interactiv cu tipurile SINGLE_CHOICE/TRUE_FALSE/MULTIPLE_CHOICE/FILL_BLANK/ORDERING, cu câmpul answer conform structurii cerute).",
    "FORMAT (strict): răspunde DOAR cu un obiect JSON valid; nu adăuga text, backticks sau markup în jurul lui.",
  ].join("\n\n");
}

export function quizSystem(): string {
  return [
    BASE,
    "Rolul tău acum: generezi un quiz (întrebări variate și interactive) care fixează conținutul unei unități didactice.",
    "Întrebările folosesc DOAR tipurile interactive: SINGLE_CHOICE (grilă clasică), TRUE_FALSE (Adevărat/Fals), MULTIPLE_CHOICE (mai multe răspunsuri corecte), FILL_BLANK (completare liberă), ORDERING (pune în ordine). Amestecă cel puțin 2 tipuri diferite.",
    "Specificații per tip:",
    "SINGLE_CHOICE: options = 4-6 variante, correctIndex = indexul variantei corecte (0-based), FĂRĂ answer.",
    "TRUE_FALSE: options = [\"Adevărat\",\"Fals\"], correctIndex = 0 sau 1, FĂRĂ answer.",
    "MULTIPLE_CHOICE: options = 4-5 variante, answer = {\"kind\":\"multiple\",\"indices\":[1,3]} cu indicii variantelor corecte.",
    "FILL_BLANK: options = variante plauzibile, answer = {\"kind\":\"fill_blank\",\"accepted\":[\"raspuns1\",\"raspuns2\"]} (variante acceptate; scrie-le simplu, normalizăm automat fără diacritice).",
    "ORDERING: options = elementele în ordinea corectă, answer = {\"kind\":\"ordering\",\"order\":[0,1,2,...]}.",
    "Nu inventa: fiecare întrebare trebuie să fie susținută de sursele oferite.",
    "FORMAT (strict): răspunde DOAR cu un obiect JSON valid. Top-level: title (string), difficulty (număr întreg 1-3), questions (array). Fiecare întrebare are EXACT câmpurile: text (string), options (array de strings), correctIndex (număr întreg, 0-based, unde se aplică), answer (obiect, doar unde se aplică), explanation (string scurtă), type (una din SINGLE_CHOICE, TRUE_FALSE, MULTIPLE_CHOICE, FILL_BLANK, ORDERING). Nu adăuga alte câmpuri, nu folosi backticks sau text în jurul JSON-ului.",
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