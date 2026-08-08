"use client";

import { useActionState } from "react";
import { Check, Loader2, AtSign, AlertTriangle } from "lucide-react";
import { updateUsername } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UsernameForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(updateUsername, {});

  return (
    <form action={action} className="space-y-4">
      {!current && (
        <p className="flex items-center gap-2 rounded-xl bg-warning/15 px-4 py-2.5 text-sm font-semibold text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Alege-ți un nume de utilizator — e nevoie de el ca prietenii să te
          găsească.
        </p>
      )}

      <div>
        <Label htmlFor="username">Nume de utilizator</Label>
        <div className="relative">
          <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input
            id="username"
            name="username"
            required
            minLength={2}
            maxLength={20}
            pattern="[a-z0-9]([a-z0-9._-]{1,18}[a-z0-9])?"
            placeholder={current ?? "ex: andrei.bac2026"}
            defaultValue={current ?? ""}
            className="pl-9"
            aria-describedby="username-hint"
          />
        </div>
        <p id="username-hint" className="mt-1.5 text-xs text-subtle">
          Unic și public — prietenii te caută după el. Litere mici, cifre,
          punct, liniuță sau underscore (2–20 caractere).
        </p>
      </div>

      {state.error && (
        <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
          <Check className="h-4 w-4" /> Numele de utilizator a fost salvat!
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Check className="h-5 w-5" />
        )}
        {pending ? "Se salvează…" : "Salvează"}
      </Button>
    </form>
  );
}
