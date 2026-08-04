"use client";

import { useState } from "react";
import { User, Palette, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/account/profile-form";
import { EmailForm } from "@/components/account/email-form";
import { PasswordForm } from "@/components/account/password-form";
import { DeleteAccount } from "@/components/account/delete-account";
import { ThemePicker } from "@/components/themes/theme-picker";
import { APP_VERSION } from "@/lib/version";

type Tab = "cont" | "teme" | "risc";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "cont", label: "Setări cont", icon: User },
  { id: "teme", label: "Teme", icon: Palette },
  { id: "risc", label: "Șterge cont", icon: Trash2 },
];

interface AccountSettingsProps {
  initialTab?: string;
  profile: { name: string; image: string };
  email: string;
  needsCurrentPassword: boolean;
  themes: {
    slug: string;
    name: string;
    light: Record<string, string>;
    dark: Record<string, string>;
  }[];
  currentTheme: string | null;
}

export function AccountSettings({
  initialTab = "cont",
  profile,
  email,
  needsCurrentPassword,
  themes,
  currentTheme,
}: AccountSettingsProps) {
  const validTab = tabs.some((t) => t.id === initialTab)
    ? (initialTab as Tab)
    : "cont";
  const [tab, setTab] = useState<Tab>(validTab);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Setările contului"
        className="inset flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full p-0.5"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-card text-ink shadow-sm"
                  : "text-subtle hover:text-ink",
                t.id === "risc" && !active && "hover:text-danger"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "cont" && (
        <div className="animate-slide-up space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-lg font-extrabold text-ink">Profil</h2>
              <ProfileForm initial={profile} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-lg font-extrabold text-ink">Email</h2>
              <EmailForm initialEmail={email} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-lg font-extrabold text-ink">Parolă</h2>
              <PasswordForm needsCurrentPassword={needsCurrentPassword} />
            </CardContent>
          </Card>

          <p className="pt-1 text-center text-xs text-subtle/70">
            Baculet {APP_VERSION}
          </p>
        </div>
      )}

      {tab === "teme" && (
        <div className="animate-slide-up">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-1 text-lg font-extrabold text-ink">Temă</h2>
              <p className="mb-4 text-sm text-subtle">
                Alege o paletă de culori. Fiecare temă se adaptează automat la
                modul luminos și întunecat. Trece cu mouse-ul peste o temă
                pentru previzualizare în direct.
              </p>
              <ThemePicker themes={themes} current={currentTheme} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "risc" && (
        <div className="animate-slide-up">
          <Card className="border-danger/40">
            <CardContent className="p-5">
              <h2 className="mb-1 text-lg font-extrabold text-danger">
                Zona de risc
              </h2>
              <p className="mb-4 text-sm text-subtle">
                Ștergerea contului e definitivă: pierzi progresul, seria și
                scorurile la teste.
              </p>
              <DeleteAccount email={email} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}