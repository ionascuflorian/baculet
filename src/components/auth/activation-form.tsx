"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Loader2, KeyRound, Mail } from "lucide-react";
import {
  requestCode,
  verifyCode,
  getDevCode,
  type OtpState,
} from "@/lib/actions/otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DevCode } from "@/components/auth/dev-code";

export function ActivationForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [sent, setSent] = useState(Boolean(defaultEmail));
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (email && sent) {
      getDevCode(email).then(({ code }) => setDevCode(code));
    }
  }, [email, sent]);

  const requestAndRemember = async (_prev: OtpState, fd: FormData) => {
    const result = await requestCode({}, fd);
    if (result.error) return result;
    const nextEmail = String(fd.get("email") ?? "").toLowerCase().trim();
    setEmail(nextEmail);
    setSent(true);
    if (result.devCode) setDevCode(result.devCode);
    return { error: "", email: nextEmail };
  };

  const [resendState, resendAction, resendPending] = useActionState<
    OtpState,
    FormData
  >(requestAndRemember, {});

  const [verifyState, verifyAction, verifyPending] = useActionState<
    OtpState,
    FormData
  >(verifyCode, {});

  return (
    <div className="space-y-4">
      {!sent ? (
        <form action={resendAction} className="space-y-4">
          <div>
            <Label htmlFor="activation-email">Email</Label>
            <Input
              id="activation-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@exemplu.ro"
              defaultValue={email}
              required
            />
          </div>

          {resendState.error && (
            <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
              {resendState.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={resendPending}>
            {resendPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            {resendPending ? "Se trimite codul…" : "Trimite codul"}
          </Button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-subtle">
            Cod trimis la{" "}
            <span className="truncate text-ink">{email || "emailul tău"}</span>
          </p>

          {devCode && <DevCode code={devCode} />}

          <div>
            <Label htmlFor="activation-code">Codul primit pe email</Label>
            <Input
              id="activation-code"
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
            {verifyPending ? "Se verifică…" : "Activează și conectează-te"}
          </Button>

          <button
            type="button"
            disabled={resendPending}
            onClick={() => {
              const fd = new FormData();
              fd.set("email", email);
              resendAction(fd);
            }}
            className="w-full text-center text-xs font-bold text-subtle transition-colors hover:text-ink disabled:opacity-50"
          >
            {resendPending ? "Se trimite…" : "Nu ai primit codul? Trimite din nou"}
          </button>
        </form>
      )}
    </div>
  );
}