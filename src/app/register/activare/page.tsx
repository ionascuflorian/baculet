import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ActivationForm } from "@/components/auth/activation-form";

export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-3xl border-2 border-feather bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
          <MailCheck className="h-7 w-7 text-accent" />
        </div>
        <h1 className="mb-1 text-2xl font-extrabold text-ink">
          Activează-ți contul
        </h1>
        <p className="mb-6 text-sm text-subtle">
          Ți-am trimis un cod. Introdu-l mai jos pentru a-ți activa contul și a
          intra pe platformă. Dacă ai deja o parolă setată, te poți loga
          direct.
        </p>
        <ActivationForm defaultEmail={email ?? ""} />
        <p className="mt-6 text-center text-sm text-subtle">
          Deja activat?{" "}
          <Link href="/login" className="font-bold text-accent">
            Autentifică-te
          </Link>
        </p>
      </div>
    </div>
  );
}