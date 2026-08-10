import Link from "next/link";
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import { HelpForm } from "@/components/help/help-form";
import { auth } from "@/lib/auth";

export default async function ContactPage() {
  const session = await auth();
  const backHref = session?.user ? "/dashboard" : "/";
  const userEmail = session?.user?.email ?? "";

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
            <Mail className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Contact
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-subtle">
            Scrie-ne orice întrebare sau propunere. Îți răspundem cât mai
            repede.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <a
            href="mailto:support@baculet.ro"
            className="animate-slide-up surface flex items-center gap-4 rounded-[1.5rem] border p-5 transition-colors hover:border-accent/40"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-subtle">
                Email
              </p>
              <p className="truncate font-bold text-ink">support@baculet.ro</p>
            </div>
          </a>

          <a
            href="/help"
            className="animate-slide-up surface flex items-center gap-4 rounded-[1.5rem] border p-5 transition-colors hover:border-accent/40"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-subtle">
                Ajutor
              </p>
              <p className="truncate font-bold text-ink">
                Întrebări frecvente
              </p>
            </div>
          </a>
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

      <SiteFooter homeHref={backHref} />
    </div>
  );
}
