"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Loader2, Mail, Lock } from "lucide-react";
import {
  requestPasswordReset,
  resetPassword,
  type ResetState,
} from "@/lib/actions/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DevCode } from "@/components/auth/dev-code";

export function ResetPasswordForm() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const [requestState, requestAction, requestPending] = useActionState<
    ResetState,
    FormData
  >(async (_prev, fd) => {
    const result = await requestPasswordReset({}, fd);
    if (result.error) return result;
    setEmail(String(fd.get("email") ?? "").toLowerCase().trim());
    setDevCode(result.devCode ?? null);
    setStep("reset");
    return result;
  }, {});

  const [resetState, resetAction, resetPending] = useActionState<
    ResetState,
    FormData
  >(resetPassword, {});

  return (
    <div className="w-full max-w-md rounded-3xl border-2 border-feather bg-card p-6 shadow-sm sm:p-8">
      <h1 className="mb-1 text-2xl font-extrabold text-ink">
        Resetează parola
      </h1>
      <p className="mb-6 text-sm text-subtle">
        Îți trimitem un cod, apoi îți poți seta o parolă nouă.
      </p>

      {step === "email" ? (
        <form action={requestAction} className="space-y-4">
          <div>
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@exemplu.ro"
              required
            />
          </div>

          {requestState.error && (
            <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
              {requestState.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={requestPending}>
            {requestPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            {requestPending ? "Se trimite codul…" : "Trimite codul"}
          </Button>
        </form>
      ) : (
        <form action={resetAction} className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-subtle">
            Cod trimis la{" "}
            <span className="truncate text-ink">{email}</span>
          </p>

          {devCode && <DevCode code={devCode} />}

          <input type="hidden" name="email" value={email} />

          <div>
            <Label htmlFor="reset-code">Codul primit</Label>
            <Input
              id="reset-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="••••••"
              className="text-center text-2xl font-extrabold tracking-[0.5em]"
              required
            />
          </div>

          <div>
            <Label htmlFor="new-password">Parola nouă</Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Minim 8 caractere"
              required
            />
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirmă parola</Label>
            <Input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repetă parola"
              required
            />
          </div>

          {resetState.error && (
            <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
              {resetState.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={resetPending}>
            {resetPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
            {resetPending ? "Se salvează…" : "Setază parola"}
          </Button>

          <button
            type="button"
            disabled={requestPending}
            onClick={() => {
              const fd = new FormData();
              fd.set("email", email);
              requestAction(fd);
            }}
            className="w-full text-center text-xs font-bold text-subtle transition-colors hover:text-ink disabled:opacity-50"
          >
            {requestPending ? "Se trimite…" : "Nu ai primit codul? Trimite din nou"}
          </button>
        </form>
      )}
    </div>
  );
}