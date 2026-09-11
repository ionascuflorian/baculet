import { Sparkles } from "lucide-react";
import { currentUser, hasPermission } from "@/lib/access";
import { prisma } from "@/lib/db";
import { getSiteAiInfo } from "@/lib/site-ai";
import { AiSettingsForm } from "@/components/admin/ai-settings-form";
import { SiteAiSettingsForm } from "@/components/admin/site-ai-settings-form";

export default async function AdminAiPage() {
  const sessionUser = await currentUser();
  if (!sessionUser) return null;
  const canManageSiteAi = hasPermission(sessionUser, "MANAGE_SITE_AI");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { aiProvider: true, aiApiKeyEnc: true, aiModel: true },
  });

  const siteAi = canManageSiteAi
    ? await getSiteAiInfo()
    : { configured: false, fallback: { provider: "google" as const, model: "gemini-3.5-flash-lite" } };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-extrabold text-ink">Setări AI</h1>
        <p className="mt-1 text-subtle">
          Configurează AI-ul folosit în panoul de administrare (generare exerciții și conținut)
          precum și AI-ul folosit pe site (Siera și generatorul de teme). Cheile sunt criptate și
          nu sunt expuse niciodată în browser.
        </p>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-feather bg-card p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="text-sm">
          <p className="font-extrabold text-ink">Cum funcționează</p>
          <p className="mt-1 font-semibold text-subtle">
            Ai două zone: <strong>cheia ta de AI</strong> (folosită de tine la generarea conținutului
            în panou) și <strong>AI-ul site-ului</strong> (folosit de Siera și la generarea de teme).
            Fiecare are propriul buton de test, care trimite un mesaj scurt către model pentru a
            verifica cheia și modelul ales.
          </p>
        </div>
      </div>

      <AiSettingsForm
        key={`content-${user?.aiProvider ?? "none"}-${user?.aiModel ?? "none"}-${user?.aiApiKeyEnc ? "key" : "nokey"}`}
        provider={user?.aiProvider ?? null}
        model={user?.aiModel ?? null}
        hasKey={Boolean(user?.aiApiKeyEnc)}
      />

      {canManageSiteAi && (
        <SiteAiSettingsForm
          key={`site-${siteAi.provider ?? "none"}-${siteAi.model ?? "none"}-${siteAi.configured}`}
          provider={siteAi.provider ?? null}
          model={siteAi.model ?? null}
          hasKey={siteAi.configured}
          fallback={siteAi.fallback}
        />
      )}

      <div className="rounded-2xl border border-feather bg-card p-5 text-sm">
        <p className="font-extrabold text-ink">Provideri suportati</p>
        <ul className="mt-2 list-disc pl-5 font-semibold text-subtle marker:text-accent">
          <li>Google (Gemini) — recomandat, inclusiv gratis dacă nu folosești o cheie proprie</li>
          <li>OpenAI (GPT) — cheia ta, model ales de tine</li>
          <li>Anthropic (Claude) — cheia ta, model ales de tine</li>
          <li>OpenRouter — o singură cheie pentru sute de modele (GPT, Claude, Gemini, Llama ș.a.)</li>
        </ul>
      </div>
    </div>
  );
}