import Link from "next/link";
import { LifeBuoy, MessageCircleQuestion, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpForm } from "@/components/help/help-form";
import { Faq } from "@/components/help/faq";
import { SiteFooter } from "@/components/site-footer";
import { auth } from "@/lib/auth";

const faqItems = [
  {
    question: "Cum îmi creez un cont?",
    answer:
      "Apasă „Creează cont”, introdu numele, emailul și o parolă. Vei primi un cod pe email cu care îți activezi contul, apoi te poți conecta.",
  },
  {
    question: "Aplicația e gratuită?",
    answer:
      "Da, Baculet e gratuită. Poți accesa toate lecțiile, testele grilă și subiectele oficiale fără să plătești nimic.",
  },
  {
    question: "Cum funcționează codul de activare de pe email?",
    answer:
      "La înregistrare îți trimitem un cod de 6 cifre. Îl introduci în pagina de activare și contul tău devine activ. Codul expiră în 10 minute.",
  },
  {
    question: "Mi-am uitat parola. Ce fac?",
    answer:
      "Te poți conecta cu codul pe email din pagina de autentificare. Apoi îți poți schimba parola din pagina de cont, secțiunea „Setări cont”.",
  },
  {
    question: "Temele alese se salvează?",
    answer:
      "Da! Alege-ți tema din pagina de cont, secțiunea „Teme”, iar preferința se salvează și se aplică pe toate dispozitivele.",
  },
  {
    question: "Ce este Siera?",
    answer:
      "Siera este asistentul tău personal pentru BAC. Poate rezuma pagina, căuta prin site, explica concepte și genera teste personalizate.",
  },
];

export default async function HelpPage() {
  const session = await auth();
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4">
        <Link
          href={session?.user ? "/dashboard" : "/"}
          className="flex items-center gap-2 text-sm font-semibold text-subtle transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi
        </Link>
        <Logo />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 pb-20 pt-6">
        <section className="animate-slide-up text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <LifeBuoy className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Cum te putem ajuta?
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-subtle">
            Citește întrebările frecvente sau trimite-ne un mesaj și îți
            răspundem în cel mai scurt timp.
          </p>
        </section>

        <section className="animate-slide-up">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-extrabold text-ink">
              Întrebări frecvente
            </h2>
          </div>
          <Faq items={faqItems} />
        </section>

        <section className="animate-slide-up">
          <h2 className="mb-4 text-xl font-extrabold text-ink">
            Trimite-ne un mesaj
          </h2>
          <div className="surface rounded-[1.5rem] p-6 sm:p-8">
            <HelpForm defaultEmail={userEmail} />
          </div>
        </section>
      </main>

      <SiteFooter homeHref={session?.user ? "/dashboard" : "/"} />
    </div>
  );
}