"use client";

import { useActionState } from "react";
import { Loader2, Check } from "lucide-react";
import { changeEmail } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailForm({ initialEmail }: { initialEmail: string }) {
  const [state, action, pending] = useActionState(changeEmail, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="email">Adresa de email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={initialEmail}
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
      {state.ok && (
        <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
          <Check className="h-4 w-4" /> Email actualizat!
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        {pending ? "Se salvează…" : "Actualizează emailul"}
      </Button>
    </form>
  );
}
