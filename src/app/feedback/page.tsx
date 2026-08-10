import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/site-footer";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { auth } from "@/lib/auth";

export default async function FeedbackPage() {
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
            <Heart className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Spune-ne părerea ta
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-subtle">
            Un bug, o idee sau un gând — fiecare feedback ne ajută să construim
            o platformă mai bună pentru BAC.
          </p>
        </section>

        <section className="animate-slide-up">
          <div className="surface rounded-[1.5rem] p-6 sm:p-8">
            <FeedbackForm defaultEmail={userEmail} />
          </div>
        </section>
      </main>

      <SiteFooter homeHref={backHref} />
    </div>
  );
}
