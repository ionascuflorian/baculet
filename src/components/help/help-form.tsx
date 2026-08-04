"use client";

import { useActionState } from "react";
import { Loader2, Check } from "lucide-react";
import { submitHelp, type HelpState } from "@/lib/actions/help";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HelpForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState<HelpState, FormData>(
    submitHelp,
    {}
  );

  if (state.ok) {
    return (
      <div className="animate-pop-in flex flex-col items-center gap-3 rounded-2xl border border-feather bg-card p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
          <Check className="h-7 w-7 text-success" />
        </span>
        <h3 className="text-lg font-extrabold text-ink">Mesaj trimis!</h3>
<p className="text-sm text-subtle">
          Îți mulțumim. Echipa noastră îți va răspunde în cel mai scurt timp.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="help-name">Nume</Label>
        <Input id="help-name" name="name" required placeholder="Numele tău" />
      </div>
      <div>
        <Label htmlFor="help-email">Email</Label>
        <Input
          id="help-email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          autoComplete="email"
          placeholder="tu@exemplu.ro"
        />
      </div>
      <div>
        <Label htmlFor="help-topic">Subiect</Label>
        <Input
          id="help-topic"
          name="topic"
          required
          placeholder="ex. Nu îmi merge testul"
        />
      </div>
      <div>
        <Label htmlFor="help-message">Descrie problema</Label>
        <textarea
          id="help-message"
          name="message"
          required
          rows={5}
          placeholder="Detaliază cât mai mult, ca să te putem ajuta rapid."
          className="w-full resize-none rounded-2xl border border-feather bg-background px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
      </div>

      {state.error && (
        <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Check className="h-5 w-5" />
        )}
        {pending ? "Se trimite…" : "Trimite mesajul"}
      </Button>
    </form>
  );
}