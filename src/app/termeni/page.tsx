import Link from "next/link";
import { ScrollText, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import { auth } from "@/lib/auth";

const sections = [
  {
    title: "1. Acceptarea termenilor",
    body: "Prin crearea unui cont și folosirea platformei Baculet accepți acești Termeni și Condiții. Dacă nu ești de acord cu ei, te rugăm să nu folosești serviciul. Prin acceptarea termenilor confirmi că ai cel puțin 16 ani sau că ai permisiunea părintelui/tutorelui legal.",
  },
  {
    title: "2. Serviciul oferit",
    body: "Baculet este o platformă de învățare pentru examenul de bacalaureat: lecții structurate pe materii și capitole, teste grilă cu corectare automată, subiecte oficiale arhivate și asistență prin asistentul automat Siera. Serviciul este gratuit în forma sa curentă; ne rezervăm dreptul de a introduce funcționalități sau planuri plătite în viitor, cu anunț prealabil.",
  },
  {
    title: "3. Contul tău",
    body: "Ești responsabil pentru corectitudinea datelor din cont (nume, email, username) și pentru păstrarea confidențialității parolei. Un cont poate fi folosit doar de o singură persoană. Ne anunți imediat dacă suspectezi că cineva a accesat contul tău fără permisiune. Poți șterge contul oricând din pagina de Cont; datele asociate sunt eliminate definitiv.",
  },
  {
    title: "4. Folosirea conținutului",
    body: "Conținutul platformei — lecții, teste, explicații, texte — este destinat folosirii personale, educaționale. Nu ai dreptul să reproduci, distribui sau comercializezi conținutul Baculet în afara platformei fără acordul nostru scris.",
  },
  {
    title: "5. Comportamentul utilizatorilor",
    body: "În timpul folosirii serviciului este interzis: încărcarea de conținut ilegal sau ofensator, încercarea de a accesa conturi sau date care nu îți aparțin, folosirea de mijloace automate care afectează funcționarea platformei și orice activitate care deranjează alți utilizatori.",
  },
  {
    title: "6. Proprietate intelectuală",
    body: "Numele Baculet, logoul și conținutul original al platformei sunt proprietatea echipei Baculet. Subiectele oficiale de bacalaureat aparțin instituțiilor abilitate și sunt oferite în platformă exclusiv în scop educațional.",
  },
  {
    title: "7. Limitarea răspunderii",
    body: "Baculet este oferit „ca atare”. Depunem eforturi constante pentru corectitudinea conținutului, dar nu putem garanta absența totală a erorilor. Rezultatele tale la examen depind de tine; platforma este un instrument de studiu, nu o garanție de promovare. Nu suntem responsabili pentru daune indirecte rezultate din folosirea serviciului.",
  },
  {
    title: "8. Suspendarea conturilor",
    body: "Ne rezervăm dreptul de a suspenda sau închide conturi care încalcă acești termeni sau care afectează buna funcționare a platformei, în special cele folosite pentru abuz, spam sau fraudă.",
  },
  {
    title: "9. Modificarea termenilor",
    body: "Putem actualiza periodic acești Termeni și Condiții. Modificările intră în vigoare la momentul publicării lor pe această pagină. Continuitatea folosirii serviciului după modificări înseamnă acceptarea noii versiuni.",
  },
  {
    title: "10. Legea aplicabilă",
    body: "Prezentii termeni sunt guvernați de legislația română. Orice litigiu legat de folosirea serviciului va fi soluționat pe cale amiabilă, iar în lipsa unei înțelegeri, de instanțele române competente.",
  },
  {
    title: "11. Contact",
    body: "Pentru întrebări legate de acești termeni, scrie-ne din pagina de contact sau la adresa de email afișată acolo. Îți răspundem în cel mai scurt timp.",
  },
];

export default async function TermsPage() {
  const session = await auth();
  const backHref = session?.user ? "/dashboard" : "/";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4">
        <Link
          href={backHref}
          className="flex items-center gap-2 text-sm font-semibold text-subtle transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi
        </Link>
        <Logo className="absolute left-1/2 -translate-x-1/2" />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 pb-20 pt-6">
        <section className="animate-slide-up text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <ScrollText className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Termeni și Condiții
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-subtle">
            Regulile simple prin care Baculet îți oferă instrumentele de
            învățare pentru BAC.
          </p>
        </section>

        <section className="space-y-4">
          {sections.map((s) => (
            <div
              key={s.title}
              className="animate-slide-up surface rounded-[1.5rem] p-6 sm:p-8"
            >
              <h2 className="mb-2 text-lg font-extrabold text-ink">
                {s.title}
              </h2>
              <p className="text-sm leading-relaxed text-subtle">{s.body}</p>
            </div>
          ))}
        </section>
      </main>

      <SiteFooter homeHref={backHref} />
    </div>
  );
}
