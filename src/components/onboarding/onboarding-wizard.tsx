"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  GraduationCap,
  Loader2,
  Palette as PaletteIcon,
  ScrollText,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ProfilePicker } from "@/components/profile/profile-picker";
import { ThemePicker } from "@/components/themes/theme-picker";
import { AvatarEditor } from "@/components/account/avatar-editor";
import {
  updateProfile,
  updateUsername,
  type ProfileState,
} from "@/lib/actions/account";
import { completeOnboarding, acceptTerms } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";
import type { ProfileId } from "@/lib/profile";
import type { Palette } from "@/components/themes/palette";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

type ThemeOption = {
  slug: string;
  name: string;
  light: Palette;
  dark: Palette;
};

interface Step {
  id: string;
  title: string;
  desc: string;
  icon: typeof UserRound;
}

interface OnboardingUser {
  name: string;
  image: string | null;
  username: string | null;
  themeSlug: string | null;
  profile: ProfileId | null;
  termsAcceptedAt: Date | null;
}

export function OnboardingWizard({
  user,
  themes,
}: {
  user: OnboardingUser;
  themes: ThemeOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [steps] = useState<Step[]>(() => {
    const base: Step[] = [
      {
        id: "profile",
        title: "Profil de studiu",
        desc: "Îți aranjăm materiile potrivite profilului tău de bacalaureat.",
        icon: GraduationCap,
      },
      {
        id: "username",
        title: "Username",
        desc: "Cum te găsesc colegii tăi în clasament și la prieteni.",
        icon: UserRound,
      },
      {
        id: "theme",
        title: "Tema site-ului",
        desc: "Alege paleta care ți se potrivește. O poți schimba oricând.",
        icon: PaletteIcon,
      },
      {
        id: "avatar",
        title: "Poza de profil",
        desc: "O poză îți face profilul prietenos. O poți adăuga și mai târziu.",
        icon: Camera,
      },
    ];
    if (!user.termsAcceptedAt) {
      return [
        {
          id: "terms",
          title: "Termeni și Condiții",
          desc: "Confirmă că ești de acord cu regulile platformei.",
          icon: ScrollText,
        },
        ...base,
      ];
    }
    return base;
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());

  const [profileState, setProfileState] = useState<{
    pending: boolean;
    error: string;
  }>({ pending: false, error: "" });

  const [usernameState, usernameAction, usernamePending] = useActionState<
    ProfileState,
    FormData
  >(updateUsername, {});
  const usernameAdvanced = useRef(false);

  const [avatarState, avatarAction, avatarPending] = useActionState<
    ProfileState,
    FormData
  >(updateProfile, {});
  const avatarAdvanced = useRef(false);

  const [preview, setPreview] = useState<string | null>(
    user.image?.startsWith("data:image") ? user.image : null
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (usernameState.ok && !usernameAdvanced.current) {
      usernameAdvanced.current = true;
      markDone("username");
      goNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameState.ok]);

  useEffect(() => {
    if (avatarState.ok && !avatarAdvanced.current) {
      avatarAdvanced.current = true;
      markDone("avatar");
      goNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarState.ok]);

  const step = steps[stepIndex];
  const pct = Math.round((done.size / steps.length) * 100);

  function markDone(id: string) {
    setDone((d) => new Set(d).add(id));
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function saveProfile(id: ProfileId) {
    if (profileState.pending) return;
    setProfileState({ pending: true, error: "" });
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setProfileState({
          pending: false,
          error: data?.error ?? "A apărut o eroare. Încearcă din nou.",
        });
        return;
      }
      setProfileState({ pending: false, error: "" });
      markDone("profile");
      goNext();
    } catch {
      setProfileState({ pending: false, error: "A apărut o eroare." });
    }
  }

  function onThemeSelected() {
    markDone("theme");
    goNext();
  }

  function finishSetup() {
    startTransition(async () => {
      await completeOnboarding();
      router.push("/dashboard");
      router.refresh();
    });
  }

  const [termsChecked, setTermsChecked] = useState(false);
  const [termsPending, setTermsPending] = useState(false);

  async function acceptTermsStep() {
    if (termsPending) return;
    setTermsPending(true);
    await acceptTerms();
    setTermsPending(false);
    markDone("terms");
    goNext();
  }

  function onFile(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Alege un fișier imagine (JPG, PNG, WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Imaginea e prea mare (max 8 MB). Încearcă una mai mică.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditing(String(reader.result ?? ""));
    reader.onerror = () => setFileError("Nu am putut citi fișierul.");
    reader.readAsDataURL(file);
  }

  const openFilePicker = () => fileRef.current?.click();

  const handleAvatarClick = () => {
    if (preview) {
      setEditing(preview);
    } else {
      openFilePicker();
    }
  };

  const handleEditorSave = (dataUrl: string) => {
    setPreview(dataUrl);
    setEditing(null);
    setFileError(null);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Configurează-ți contul
          </h1>
          <p className="text-sm text-subtle">
            Câțiva pași rapizi și ești gata de învățat. Poți omite oricând.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={finishSetup}
          disabled={pending || (!user.termsAcceptedAt && !done.has("terms"))}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Termină mai târziu"
          )}
        </Button>
      </div>

      {/* Stepper */}
      <div className="overflow-x-auto pb-1">
        <div className="flex w-fit items-start gap-2 sm:gap-3">
          {steps.map((s, i) => {
            const isDone = done.has(s.id);
            const isCurrent = i === stepIndex;
            return (
              <div key={s.id} className="flex items-start gap-2 sm:gap-3">
                <div className="flex min-w-0 flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors",
                      isDone
                        ? "bg-success text-white"
                        : isCurrent
                          ? "bg-accent text-white shadow-md"
                          : "border border-feather bg-ink/5 text-subtle"
                    )}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "hidden max-w-[6.5rem] truncate text-center text-[11px] font-bold sm:block",
                      isDone
                        ? "text-success"
                        : isCurrent
                          ? "text-ink"
                          : "text-subtle"
                    )}
                  >
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      "mt-[1.05rem] h-0.5 w-5 rounded-full sm:w-7",
                      done.has(s.id) ? "bg-success" : "bg-feather"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Progress value={pct} />

      <div className="surface rounded-[2rem] p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {stepIndex < steps.length ? (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10">
                  <step.icon className="h-5 w-5 text-accent" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-ink">
                    {step.title}
                  </h2>
                  <p className="text-sm text-subtle">{step.desc}</p>
                </div>
              </div>

              {step.id === "terms" && (
                <div className="space-y-4">
                  <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl border border-feather bg-background/60 p-4 text-sm leading-relaxed text-subtle">
                    <p>
                      <strong className="text-ink">Ce primești:</strong>{" "}
                      lecții structurate pe materii, teste grilă cu corectare
                      automată, subiecte oficiale și asistentul Siera.
                    </p>
                    <p>
                      <strong className="text-ink">Contul tău:</strong> ești
                      responsabil de corectitudinea datelor și de păstrarea
                      parolei. Contul poate fi folosit doar de tine.
                    </p>
                    <p>
                      <strong className="text-ink">Conținutul:</strong> este
                      pentru uz personal, educațional — nu ai dreptul să-l
                      reproduci sau comercializezi fără acordul nostru.
                    </p>
                    <p>
                      <strong className="text-ink">Datele tale:</strong> nu
                      vindem și nu închiriem datele către terți. Detalii în
                      Politica de confidențialitate.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-feather bg-card p-3.5 transition-colors hover:border-accent/40">
                    <input
                      type="checkbox"
                      checked={termsChecked}
                      onChange={(e) => setTermsChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[--accent]"
                    />
                    <span className="text-sm leading-relaxed text-subtle">
                      Am citit și sunt de acord cu{" "}
                      <a
                        href="/termeni"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-accent hover:underline"
                      >
                        Termenii și Condițiile
                      </a>{" "}
                      și{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-accent hover:underline"
                      >
                        Politica de confidențialitate
                      </a>
                      .
                    </span>
                  </label>

                  <Button
                    type="button"
                    onClick={acceptTermsStep}
                    disabled={!termsChecked || termsPending}
                    className="w-full"
                  >
                    {termsPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {termsPending ? "Se salvează…" : "Accept și continuă"}
                  </Button>
                </div>
              )}

              {step.id === "profile" && (
                <div className="space-y-4">
                  <ProfilePicker
                    value={user.profile}
                    onChange={saveProfile}
                    disabled={profileState.pending}
                  />
                  {profileState.error && (
                    <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                      {profileState.error}
                    </p>
                  )}
                  <p className="text-xs font-semibold text-subtle">
                    Poți alege profilul oricând din pagina Cont.
                  </p>
                </div>
              )}

              {step.id === "username" && (
                <div className="space-y-4">
                  <form action={usernameAction} className="space-y-4">
                    <div>
                      <Input
                        name="username"
                        defaultValue={user.username ?? ""}
                        placeholder="ex. andrei_bac2027"
                        minLength={2}
                        maxLength={20}
                        pattern="[a-z0-9]([a-z0-9._\-]{1,18}[a-z0-9])?"
                        required
                        autoFocus
                      />
                      <p className="mt-1.5 text-xs font-semibold text-subtle">
                        Litere mici, cifre, punct, liniuță sau underscore ·
                        2–20 caractere.
                      </p>
                    </div>
                    {usernameState.error && (
                      <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                        {usernameState.error}
                      </p>
                    )}
                    <Button type="submit" disabled={usernamePending}>
                      {usernamePending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Salvează și continuă <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              )}

              {step.id === "theme" && (
                <div className="space-y-4">
                  <ThemePicker
                    themes={themes}
                    current={user.themeSlug}
                    onSelected={onThemeSelected}
                  />
                  <p className="text-xs font-semibold text-subtle">
                    Tema se salvează automat și se sincronizează pe toate
                    dispozitivele.
                  </p>
                </div>
              )}

              {step.id === "avatar" && (
                <div className="space-y-4">
                  <form action={avatarAction} className="space-y-4">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-feather/60"
                        aria-label="Schimbă poza de profil"
                      >
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview}
                            alt="Previzualizare"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl font-extrabold text-subtle">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <Camera className="h-6 w-6" />
                        </span>
                      </button>
                      <div className="flex flex-col gap-1.5">
                        <p className="font-bold text-ink">Poza de profil</p>
                        <p className="text-xs text-subtle">
                          {preview
                            ? "Click pe poză pentru a-i modifica cropul."
                            : "Click pe poză pentru a încărca și edita o fotografie."}
                        </p>
                        {preview && (
                          <button
                            type="button"
                            onClick={openFilePicker}
                            className="w-fit text-xs font-semibold text-accent transition-colors hover:underline"
                          >
                            Schimbă poza
                          </button>
                        )}
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          onFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    {fileError && (
                      <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                        {fileError}
                      </p>
                    )}

                    <input type="hidden" name="name" value={user.name} />
                    <input type="hidden" name="image" value={preview ?? ""} />

                    {avatarState.error && (
                      <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                        {avatarState.error}
                      </p>
                    )}

                    {editing && (
                      <AvatarEditor
                        imageSrc={editing}
                        onClose={() => setEditing(null)}
                        onSave={handleEditorSave}
                        onPickImage={openFilePicker}
                      />
                    )}

                    {preview ? (
                      <Button type="submit" disabled={avatarPending}>
                        {avatarPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Salvează poza și continuă{" "}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button onClick={goNext} disabled={pending}>
                        Continuă fără poză <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </form>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-feather pt-4">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  disabled={stepIndex === 0 || pending}
                >
                  <ArrowLeft className="h-4 w-4" /> Înapoi
                </Button>
                {step.id !== "terms" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (step.id === "theme") markDone("theme");
                      goNext();
                    }}
                    disabled={pending}
                  >
                    Omită
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-success/10 text-3xl">
                🎉
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">
                Gata de start!
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-subtle">
                Contul tău e configurat. Acum poți începe să înveți — sau să
                completezi mai târziu ce ai omis, din pagina Cont.
              </p>
              <Button
                size="lg"
                className="mt-6"
                onClick={finishSetup}
                disabled={pending}
              >
                {pending && <Loader2 className="h-5 w-5 animate-spin" />}
                Mergi la dashboard <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
