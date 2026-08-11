import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { KonamiEasterEgg } from "@/components/konami-easter-egg";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 text-center">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mb-8">
        <Logo />
      </div>

      <p className="text-8xl font-extrabold tracking-tight text-ink">
        404<span className="text-accent">.</span>
      </p>

      <h1 className="mt-6 max-w-md text-2xl font-extrabold tracking-tight text-ink">
        Hopa! Pagina asta a fugit la BAC mai devreme.
      </h1>

      <p className="mt-3 max-w-md text-subtle">
        Siera jura că există, dar la proba scrisă nu a mai venit. Verifică
        adresa sau întoarce-te la prima materie.
      </p>

      <Button asChild className="mt-8">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" /> Întoarce-te acasă
        </Link>
      </Button>

      <KonamiEasterEgg />

      <p className="pointer-events-none absolute bottom-4 text-xs text-subtle/60">
        P.S. Pe-aici se ascunde și un cod secret. Noroc la găsit!
      </p>
    </main>
  );
}
