"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, Mail, KeyRound, ArrowLeft } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { requestCode, verifyCode } from "@/lib/actions/otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";
import { DevCode } from "@/components/auth/dev-code";
import { cn } from "@/lib/utils";

type Tab = "password" | "otp";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [tab, setTab] = useState<Tab>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [passwordState, passwordAction, passwordPending] = useActionState(
    login,
    {}
  );

  const [otpError, setOtpError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyCode,
    {}
  );

  const resendCode = async () => {
    const fd = new FormData();
    fd.set("email", email);
    setRequesting(true);
    const state = await requestCode({}, fd);
    setRequesting(false);
    if (state.error) {
      setOtpError(state.error);
      setStep("email");
    } else if (state.devCode) {
      setDevCode(state.devCode);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border-2 border-feather bg-card p-6 shadow-sm sm:p-8">
      <h1 className="mb-1 text-2xl font-extrabold text-ink">
        Bun venit înapoi!
      </h1>
      <p className="mb-6 text-sm text-subtle">
        Autentifică-te și continuă seria de studiu.
      </p>

      {googleEnabled && (
        <>
          <GoogleButton />
          <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-subtle">
            <span className="h-px flex-1 bg-feather" />
            sau
            <span className="h-px flex-1 bg-feather" />
          </div>
        </>
      )}

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-feather/60 p-1">
        {(
          [
            { id: "password", label: "Parolă", icon: KeyRound },
            { id: "otp", label: "Cod pe email", icon: Mail },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setStep("email");
            }}
            className={cn(
              "pressable flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
              tab === t.id ? "bg-card text-ink shadow-sm" : "text-subtle"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "password" ? (
        <form action={passwordAction} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@exemplu.ro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Parolă</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>

          {passwordState.error && (
            <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
              {passwordState.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={passwordPending}>
            {passwordPending && <Loader2 className="h-5 w-5 animate-spin" />}
            {passwordPending ? "Se autentifică…" : "Autentifică-te"}
          </Button>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-subtle transition-colors hover:text-accent"
            >
              Ai uitat parola?
            </Link>
          </div>
        </form>
      ) : (
        <div>
          {step === "email" ? (
            <form
              action={async (fd: FormData) => {
                setRequesting(true);
                setOtpError("");
                const state = await requestCode({}, fd);
                setRequesting(false);
                if (state.error) {
                  setOtpError(state.error);
                } else {
                  setEmail(String(fd.get("email") ?? "").toLowerCase().trim());
                  setDevCode(state.devCode ?? null);
                  setStep("code");
                }
              }}
              className="space-y-4"
            >
              <p className="text-sm text-subtle">
                Îți trimitem un cod pe email. Dacă nu ai cont, ți-l creăm automat.
              </p>
              <div>
                <Label htmlFor="otp-email">Email</Label>
                <Input
                  id="otp-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@exemplu.ro"
                  defaultValue={email}
                  required
                />
              </div>

              {otpError && (
                <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                  {otpError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={requesting}>
                {requesting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}
                {requesting ? "Se trimite codul…" : "Trimite codul"}
              </Button>
            </form>
          ) : (
            <form action={verifyAction} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="flex items-center gap-1 text-sm font-bold text-accent hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" /> Schimbă emailul
                </button>
                <span className="text-sm font-semibold text-subtle">{email}</span>
              </div>

              <div>
                <Label htmlFor="code">Codul primit pe email</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]*"
                  placeholder="••••••"
                  className="text-center text-2xl font-extrabold tracking-[0.5em]"
                  required
                />
                <input type="hidden" name="email" value={email} />
              </div>

              {devCode && <DevCode code={devCode} />}

              {verifyState.error && (
                <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                  {verifyState.error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={verifyPending}>
                {verifyPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <KeyRound className="h-5 w-5" />
                )}
                {verifyPending ? "Se verifică…" : "Conectează-te"}
              </Button>

              <button
                type="button"
                onClick={resendCode}
                className="w-full text-center text-xs font-bold text-subtle hover:text-ink"
              >
                Nu ai primit codul? Trimite din nou
              </button>
            </form>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-subtle">
        Nu ai cont?{" "}
        <Link href="/register" className="font-bold text-accent">
          Creează unul gratuit
        </Link>
      </p>
    </div>
  );
}
