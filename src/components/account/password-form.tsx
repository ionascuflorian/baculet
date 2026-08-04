"use client";

import { useActionState } from "react";
import { Loader2, Check, KeyRound } from "lucide-react";
import { changePassword } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PasswordForm({
  needsCurrentPassword,
}: {
  needsCurrentPassword: boolean;
}) {
  const [state, action, pending] = useActionState(changePassword, {});

  return (
    <form action={action} className="space-y-4">
      {needsCurrentPassword && (
        <div>
          <Label htmlFor="currentPassword">Parola actuală</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="newPassword">Parola nouă</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Minim 8 caractere"
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirmă parola</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repetă parola"
            required
          />
        </div>
      </div>

      {state.error && (
        <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
          <Check className="h-4 w-4" /> Parola a fost schimbată!
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
        {pending ? "Se salvează…" : "Schimbă parola"}
      </Button>
    </form>
  );
}
