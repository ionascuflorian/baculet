"use client";

import { useActionState, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { changeEmail, verifyEmailChange } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailForm({ initialEmail }: { initialEmail: string }) {
  const [state, action, pending] = useActionState(changeEmail, {});
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailChange,
    {}
  );
  const [confirmNeeded, setConfirmNeeded] = useState(false);

  return (
    <>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="email">Adresa de email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={initialEmail}
            disabled={confirmNeeded}
            required
          />
          <p className="mt-1 text-xs text-subtle">
            Folosește această adresă și pentru conectarea cu codul pe email.
          </p>
        </div>

        {state.error && (
          <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {state.error}
          </p>
        )}
        {state.ok && !state.pendingEmail && (
          <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
            <Check className="h-4 w-4" /> Email actualizat!
          </p>
        )}

        {!confirmNeeded && (
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {pending ? "Se salvează…" : "Actualizează emailul"}
          </Button>
        )}
      </form>

      {state.pendingEmail && !confirmNeeded && (
        <div className="mt-4 rounded-xl bg-accent/5 p-4">
          <p className="text-sm font-semibold text-ink">
            Ți-am trimis un cod de verificare la <b>{state.pendingEmail}</b>.
          </p>
          <p className="mt-1 text-xs text-subtle">
            Introdu codul pentru a confirma noua adresă. Dacă nu îl vezi,
            verifică spam-ul.
          </p>
          {state.devCode && (
            <p className="mt-2 text-xs font-mono text-subtle">
              Cod (dev): <b>{state.devCode}</b>
            </p>
          )}
          <button
            type="button"
            onClick={() => setConfirmNeeded(true)}
            className="mt-2 text-sm font-bold text-accent underline-offset-2 hover:underline"
          >
            Am codul — confirmă schimbarea
          </button>
        </div>
      )}

      {confirmNeeded && (
        <form action={verifyAction} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="code">Cod de verificare (6 cifre)</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              required
            />
          </div>

          {verifyState.error && (
            <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
              {verifyState.error}
            </p>
          )}
          {verifyState.ok && (
            <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
              <Check className="h-4 w-4" /> Email modificat cu succes!
            </p>
          )}

          <Button type="submit" disabled={verifyPending}>
            {verifyPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {verifyPending ? "Se verifică…" : "Confirmă emailul"}
          </Button>
          <button
            type="button"
            onClick={() => setConfirmNeeded(false)}
            className="text-sm font-semibold text-subtle underline-offset-2 hover:underline"
          >
            Înapoi
          </button>
        </form>
      )}
    </>
  );
}
