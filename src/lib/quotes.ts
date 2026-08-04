export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  { text: "Succesul este suma micilor eforturi repetate zi de zi.", author: "Robert Collier" },
  { text: "Nu trebuie să fii perfect, trebuie doar să fii mai bun decât ieri.", author: "Proverb" },
  { text: "Examenul nu îți măsoară valoarea, ci doar cât de bine te-ai pregătit.", author: "Anonim" },
  { text: "Disciplina bate motivația. Fă un pas, chiar și mic, în fiecare zi.", author: "Anonim" },
  { text: "Începutul este cea mai grea parte. După aceea totul devine ritm.", author: "Platon" },
  { text: "Cei care câștigă examenul sunt cei care au transformat studiul într-un obicei.", author: "Anonim" },
  { text: "Oricât de lent mergi, atât timp cât nu te oprești, progresezi.", author: "Confucius" },
  { text: "Geniul e 1% inspirație și 99% transpirație.", author: "Thomas Edison" },
  { text: "Nu ești definit de rezultatul unui examen, ci de efortul depus în drumul către el.", author: "Anonim" },
  { text: "Fiecare zi de studiu e o cărămidă la zidul viitorului tău.", author: "Anonim" },
  { text: "Poți să faci tot ce vrei dacă înveți să-ți organizezi timpul, nu doar energia.", author: "Anonim" },
  { text: "A învăța nu înseamnă să știi totul, ci să nu renunți să afli.", author: "Anonim" },
  { text: "Răbdarea și timpul fac mai mult decât forța și graba.", author: "Jean de La Fontaine" },
  { text: "Căderea nu e un eșec; eșecul e să rămâi unde ai căzut.", author: "Socrate" },
  { text: "Viitorul aparține celor care se pregătesc azi pentru el.", author: "Malcolm X" },
  { text: "Orice munte se urcă pas cu pas, nu cu o singură săritură.", author: "Anonim" },
  { text: "Azi semeni cu răbdare, mâine vei culege cu încredere.", author: "Proverb românesc" },
  { text: "Nimic de valoare nu vine fără efort — nici măcar nota bună.", author: "Anonim" },
  { text: "Cu răbdare și disciplină, cele grele devin rutină.", author: "Anonim" },
  { text: "Pregătirea este secretul siguranței; efortul nevăzut e cel mai puternic.", author: "Anonim" },
  { text: "Nu-ți compara ziua cu ziua altcuiva. Compară-te doar cu cel de ieri.", author: "Anonim" },
  { text: "Când crezi că ai terminat de învățat, mai ai încă un pas.", author: "Anonim" },
  { text: "O oră de acum nu se întoarce. Dă-i un rost.", author: "Anonim" },
  { text: "Încrederea vine din pregătire continuă, nu din noroc.", author: "Anonim" },
  { text: "Bravo celui care nu cade, ci se ridică după fiecare pas greșit.", author: "Anonim" },
  { text: "Mica disciplină zilnică bate un efort uriaș făcut o singură dată.", author: "Anonim" },
  { text: "Ți-ai fixat obiectivul? Atunci fă primul pas. Începe cu prima pagină.", author: "Anonim" },
  { text: "BAC-ul se dă o dată, dar obiceiul de a învăța rămâne o viață.", author: "Anonim" },
  { text: "Somnul de azi nu dă note, dar nici elanul de ieri. Alege echilibrul.", author: "Anonim" },
  { text: "Cu cât înveți mai devreme, cu atât aștepți mai liniștit examenul.", author: "Anonim" },
];

export function quoteForDay(date: Date): Quote {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}