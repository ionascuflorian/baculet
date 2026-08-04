import Link from "next/link";
import {
  BookOpen,
  FileText,
  Flame,
  GraduationCap,
  ListChecks,
  TrendingUp,
  ArrowRight,
  LogIn,
  UserPlus,
  MousePointerClick,
  PenLine,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";
import { APP_VERSION } from "@/lib/version";

const features = [
  {
    icon: BookOpen,
    title: "Materii și lecții",
    text: "Conținut structurat pe materii și capitole, acoperind toate profilele de BAC.",
  },
  {
    icon: ListChecks,
    title: "Teste grilă",
    text: "Exersează exact ca la examen, cu corectare instantă și explicații.",
  },
  {
    icon: FileText,
    title: "Subiecte oficiale",
    text: "Arhivă cu subiectele date la BAC, pe ani și sesiuni, cu bareme.",
  },
  {
    icon: Flame,
    title: "Seria de studiu",
    text: "Păstrează-ți ritmul zi de zi. Streak-ul te ține motivat ca o aplicație de jocuri.",
  },
  {
    icon: TrendingUp,
    title: "Progres vizibil",
    text: "Urmărește ce capitole ai parcurs și cum evoluează scorurile tale la teste.",
  },
  {
    icon: GraduationCap,
    title: "Gândit pentru BAC",
    text: "Tot ce primești e aliniat cu programa și cu structura reală a examenului.",
  },
];

const steps = [
  {
    icon: MousePointerClick,
    title: "Creează-ți contul",
    text: "Gratuit, în 30 de secunde, cu email și confirmare prin cod. Fără card.",
  },
  {
    icon: BookOpen,
    title: "Învață pas cu pas",
    text: "Parcurge lecții structurate pe materii și capitole, cu ritmul tău.",
  },
  {
    icon: PenLine,
    title: "Exersează ca la examen",
    text: "Face teste grilă și subiecte oficiale cu corectare instantă și explicații.",
  },
];

const stats = [
  { value: "12+", label: "materii acoperite" },
  { value: "300+", label: "teste grilă" },
  { value: "1000+", label: "întrebări explicatate" },
  { value: "24/7", label: "ajutor din partea asistentei Siera" },
];

export default async function Home() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn ? (
            <Button asChild variant="default">
              <Link href="/dashboard">Continuă învățarea</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">
                  <span className="hidden sm:inline">Autentificare</span>
                  <LogIn className="h-5 w-5 sm:hidden" />
                </Link>
              </Button>
              <Button asChild variant="accent">
                <Link href="/register">
                  <span className="hidden sm:inline">Creează cont gratuit</span>
                  <UserPlus className="h-5 w-5 sm:hidden" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-16 pt-14 text-center">
          <div className="animate-slide-up inset flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-warning">
            <Flame className="h-4 w-4 text-warning" />
            Bacalaureatul nu e un capăt. E doar o etapă.
          </div>
          <h1 className="animate-slide-up max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-6xl [animation-delay:80ms]">
            Toate resursele pentru{" "}
            <span className="text-accent">BAC</span>, într-un singur loc.
          </h1>
          <p className="animate-slide-up max-w-2xl text-lg text-subtle sm:text-xl [animation-delay:160ms]">
            Lecții, teste grilă și subiecte oficiale — structurate pe materii și
            capitole, cu progres salvat și seria ta de studiu zilnică.
          </p>
          <div className="animate-slide-up flex flex-col gap-3 sm:flex-row [animation-delay:240ms]">
            <Button asChild size="lg" variant="default">
              <Link href={isLoggedIn ? "/dashboard" : "/register"}>
                Începe gratuit <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            {!isLoggedIn && (
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Am deja cont</Link>
              </Button>
            )}
          </div>
        </section>

        {/* Statistici */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="animate-slide-up surface rounded-[1.5rem] p-5 text-center"
                style={{ animationDelay: `${100 + i * 80}ms` }}
              >
                <p className="text-3xl font-extrabold tracking-tight text-accent">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-subtle">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cum funcționează */}
        <section className="border-y border-feather/60 bg-card/40 py-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="animate-slide-up mb-2 text-center text-3xl font-extrabold tracking-tight text-ink">
              Cum funcționează
            </h2>
            <p className="animate-slide-up mb-10 text-center text-subtle">
              Trei pași simpli între tine și nota de care ai nevoie.
            </p>
            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s.title}
                  className="animate-slide-up surface surface-hover rounded-[1.5rem] p-6"
                  style={{ animationDelay: `${100 + i * 110}ms` }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10">
                      <s.icon className="h-5 w-5 text-accent" />
                    </span>
                    <span className="text-sm font-extrabold text-subtle">
                      Pas {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-1 text-lg font-bold text-ink">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-subtle">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Funcționalități */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="animate-slide-up surface surface-hover rounded-[1.5rem] p-6"
                style={{ animationDelay: `${100 + i * 90}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-1 text-xl font-bold tracking-tight text-ink">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-subtle">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
          <div className="animate-slide-up relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-accent to-brand-dark p-8 text-center text-white sm:p-12">
            <div className="relative z-10 mx-auto max-w-2xl">
              <h2 className="mb-3 text-3xl font-extrabold tracking-tight">
                Pornește la drum spre BAC, azi.
              </h2>
              <p className="mb-6 text-white/85">
                E gratuit și îți ia mai puțin de un minut să începi.
              </p>
              <Button
                asChild
                size="lg"
                variant="default"
                className="bg-white text-accent hover:bg-white/90"
              >
                <Link href={isLoggedIn ? "/dashboard" : "/register"}>
                  {isLoggedIn ? "Continuă învățarea" : "Creează cont gratuit"}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-feather/60 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Logo />
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-subtle">
              <Link href="/login" className="transition-colors hover:text-ink">
                Autentificare
              </Link>
              <Link
                href="/register"
                className="transition-colors hover:text-ink"
              >
                Creează cont
              </Link>
              <Link href="/help" className="transition-colors hover:text-ink">
                Ajutor
              </Link>
            </nav>
          </div>
          <p className="mt-6 border-t border-feather/60 pt-6 text-center text-sm text-subtle">
            Baculet · Învață pentru BAC cu ritm, nu cu panică.{" "}
            <span className="text-xs opacity-70">{APP_VERSION}</span>
          </p>
        </div>
      </footer>
    </div>
  );
}