import { Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";

export default async function AdminAiPage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { aiProvider: true, aiApiKeyEnc: true },
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Setări AI</h1>
        <p className="mt-1 text-subtle">
          Configurează cheia ta de inteligență artificială pentru a genera exerciții
          pentru lecții, în panoul de administrare. Cheia este criptată și nu este
          expusă niciodată în browser.
        </p>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-feather bg-card p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <p className="font-extrabold text-ink">Cum funcționează</p>
          <p className="mt-1 font-semibold text-subtle">
            Alege un provider de AI, salvezi cheia ta, apoi în pagina unei lecții apesei
            „Generează exerciții cu AI". Generatorul folosește conținutul lecției ca
            sursă și trimite rezultatul în panou pentru verificare înainte de salvare.
          </p>
        </div>
      </div>

      <AiSettingsForm provider={user?.aiProvider ?? null} hasKey={Boolean(user?.aiApiKeyEnc)} />

      <div className="rounded-2xl border border-feather bg-card p-5 text-sm">
        <p className="font-extrabold text-ink">Provideri suportati</p>
        <ul className="mt-2 list-disc pl-5 font-semibold text-subtle marker:text-accent">
          <li>Google (Gemini) — recomandat, inclusiv gratis dacă nu folosești o cheie proprie</li>
          <li>OpenAI (GPT) — cheia ta, model gpt-4o-mini</li>
          <li>Anthropic (Claude) — cheia ta, model claude-3-5-haiku</li>
        </ul>
      </div>
    </div>
  );
}