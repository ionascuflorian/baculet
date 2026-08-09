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
  Play,
  Check,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@/lib/auth";
import { DemoSection } from "@/components/landing/demo-section";
import { Reveal } from "@/components/landing/reveal";
import { DemoQuiz } from "@/components/landing/demo-quiz";
import { DemoSiera } from "@/components/landing/demo-siera";
import { DemoLeaderboard } from "@/components/landing/demo-leaderboard";
import { DemoStreak } from "@/components/landing/demo-streak";
import { DemoDashboard } from "@/components/landing/demo-dashboard";

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
    text: "Păstrează-ți ritmul zi de zi. Streak-ul te ține motivat, ca într-o aplicație de jocuri.",
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
    text: "Fă teste grilă și subiecte oficiale cu corectare instantă și explicații.",
  },
];

const stats = [
  { value: "12+", label: "materii acoperite" },
  { value: "300+", label: "teste grilă" },
  { value: "1000+", label: "întrebări cu explicații" },
  { value: "24/7", label: "ajutor din partea asistentei Siera" },
];

const trustPoints = ["Gratuit", "Fără card", "Datele tale rămân ale tale"];

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
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-14rem] -z-10 h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-accent/15 via-brand/10 to-warning/10 blur-3xl"
          />
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-14 pt-14 text-center sm:pt-20">
            <div className="animate-slide-up flex items-center gap-2 rounded-full border border-feather/70 bg-card/60 px-4 py-2 text-sm font-semibold text-warning backdrop-blur">
              <Flame className="h-4 w-4 text-warning" />
              Bacalaureatul nu e un capăt. E doar o etapă.
            </div>
            <h1 className="animate-slide-up max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-6xl [animation-delay:80ms]">
              Toate resursele pentru{" "}
              <span className="bg-gradient-to-r from-accent to-brand-dark bg-clip-text text-transparent">
                BAC
              </span>
              , într-un singur loc.
            </h1>
            <p className="animate-slide-up max-w-2xl text-lg text-subtle sm:text-xl [animation-delay:160ms]">
              Lecții, teste grilă și subiecte oficiale — structurate pe materii și
              capitole, cu progresul salvat și seria ta zilnică de studiu.
            </p>
            <div className="animate-slide-up flex flex-col gap-3 sm:flex-row [animation-delay:240ms]">
              <Button asChild size="lg" variant="default">
                <Link href={isLoggedIn ? "/dashboard" : "/register"}>
                  Începe gratuit <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              {!isLoggedIn && (
                <>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Am deja cont</Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg">
                    <Link href="#demo-quiz" className="text-accent">
                      <Play className="h-4 w-4" /> Vezi cum merge
                    </Link>
                  </Button>
                </>
              )}
            </div>
            {!isLoggedIn && (
              <ul className="animate-slide-up flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm font-semibold text-subtle [animation-delay:320ms]">
                {trustPoints.map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-success" /> {t}
                  </li>
                ))}
              </ul>
            )}
            <div className="animate-slide-up mt-6 w-full [animation-delay:400ms]">
              <DemoDashboard />
            </div>
          </div>
        </section>

        {/* Statistici */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="surface surface-hover rounded-[1.5rem] p-5 text-center">
                  <p className="text-3xl font-extrabold tracking-tight text-accent">
                    {s.value}
                  </p>
                  <p className="mt-1 text-sm text-subtle">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Demo principal: quiz */}
        <DemoSection
          id="demo-quiz"
          eyebrow="Demo live · teste grilă"
          title="Simte testul de BAC"
          titleAccent="înainte să-l dai."
          copy="Alege un răspuns și primești corectare instant, cu explicație pentru fiecare variantă — exact ca la un test real. Scorul se salvează în cont și contribuie la XP-ul tău."
        >
          <DemoQuiz />
        </DemoSection>

        {/* Siera */}
        <DemoSection
          id="demo-siera"
          eyebrow="Asistenta Siera"
          title="Întreab-o pe Siera oricând"
          titleAccent="ai o nelămurire."
          copy="Siera îți rezumă lecții, îți explică exerciții pas cu pas și îți pregătește mini-teste. Scrie-i o întrebare sau alege una dintre sugestii — îți răspunde instant, ca aici."
          reversed
          glow="accent"
        >
          <DemoSiera />
        </DemoSection>

        {/* Clasament */}
        <DemoSection
          id="demo-clasament"
          eyebrow="Clasament & XP"
          title="Fiecare test te urcă"
          titleAccent="în clasament."
          copy="Câștigi XP din cele mai bune scoruri la teste și din lecțiile completate. Vezi locul tău în topul global sau compară-te cu prietenii."
          glow="success"
        >
          <DemoLeaderboard />
        </DemoSection>

        {/* Streak */}
        <DemoSection
          id="demo-streak"
          eyebrow="Seria de studiu"
          title="Consistența se vede"
          titleAccent="zi de zi."
          copy="Aplicația îți ține seria vie și îți arată cât timp mai ai până la resetarea zilei. Un singur test pe zi îți apără flacăra — și obiceiul rămâne."
          reversed
          glow="warning"
        >
          <DemoStreak />
        </DemoSection>

        {/* Cum funcționează */}
        <section className="border-y border-feather/60 bg-card/40 py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4">
            <Reveal>
              <h2 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Cum funcționează
              </h2>
              <p className="mb-10 text-center text-subtle">
                Trei pași simpli între tine și nota de care ai nevoie.
              </p>
            </Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.1}>
                  <div className="surface surface-hover relative h-full rounded-[1.5rem] p-6">
                    <span className="absolute right-5 top-5 bg-gradient-to-br from-accent to-brand-dark bg-clip-text text-4xl font-black text-transparent opacity-20">
                      {i + 1}
                    </span>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10">
                      <s.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="mb-1 text-lg font-bold text-ink">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-subtle">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Funcționalități */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-16 sm:pt-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="surface surface-hover h-full rounded-[1.5rem] p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                    <f.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mb-1 text-xl font-bold tracking-tight text-ink">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-subtle">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-accent to-brand-dark p-8 text-center text-white sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              />
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
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-feather/60">
        <SiteFooter />
      </footer>
    </div>
  );
}
