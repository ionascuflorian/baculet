import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import { auth } from "@/lib/auth";

const sections = [
  {
    title: "Ce date colectăm",
    body: "Colectăm datele pe care ni le oferi direct: nume, adresă de email și parolă criptată la crearea contului. În timpul folosirii, salvăm progresul tău la lecții și teste, preferințele de temă și widgeturi, seria de studiu și alte setări necesare funcționării aplicației.",
  },
  {
    title: "Cum folosim datele",
    body: "Datele tale sunt folosite exclusiv pentru a-ți oferi și îmbunătăți serviciile Baculet: sincronizarea progresului, salvarea preferințelor, trimiterea de mesaje de suport și, dacă alegi, notificări de studiu. Nu vindem și nu închiriem datele tale către terți.",
  },
  {
    title: "Parola și securitatea",
    body: "Parola ta este stocată doar sub formă criptată (hash) și nu poate fi citită de nimeni, inclusiv de noi. Folosim conexiuni criptate (HTTPS) și respecăm bunele practici de securitate pentru a-ți proteja datele.",
  },
  {
    title: "Cookie-uri și sesiune",
    body: "Folosim cookie-uri strict necesare pentru autentificare și pentru a-ți ține sesiunea activă. Nu folosim cookie-uri de urmărire a comportamentului de navigare în scopuri publicitare.",
  },
  {
    title: "Servicii terțe",
    body: "Pentru trimiterea de emailuri (de exemplu codul de activare sau mesajele de suport) folosim un furnizor de emailuri, căruia îi transmite doar datele necesare tranzacției (adresă de email, nume). Datele de plată nu sunt procesate de noi.",
  },
  {
    title: "Drepturile tale",
    body: "Poți oricând să îți accesezi, corectezi sau ștergi datele personale direct din aplicație, din pagina de cont. Ștergerea contului elimină definitiv toate datele asociate.",
  },
  {
    title: "Contact",
    body: "Pentru întrebări legate de confidențialitate, scrie-ne din pagina de contact sau la adresa de email afișată acolo. Îți răspundem în cel mai scurt timp.",
  },
];

export default async function PrivacyPage() {
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
            <ShieldCheck className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Politica de confidențialitate
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-subtle">
            Transparență totală despre datele pe care le colectăm și cum le
            folosim.
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
