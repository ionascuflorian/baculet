"use client";

import { useActionState } from "react";
import { Loader2, Check } from "lucide-react";
import { submitFeedback, type FeedbackState } from "@/lib/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function FeedbackForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(
    submitFeedback,
    {}
  );

  if (state.ok) {
    return (
      <div className="animate-pop-in flex flex-col items-center gap-3 rounded-2xl border border-feather bg-card p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
          <Check className="h-7 w-7 text-success" />
        </span>
        <h3 className="text-lg font-extrabold text-ink">Mulțumim!</h3>
        <p className="text-sm text-subtle">
          Feedback-ul tău a fost înregistrat. Ne ajută să facem Baculet mai bun.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="feedback-name">Nume</Label>
          <Input
            id="feedback-name"
            name="name"
            required
            placeholder="Numele tău"
          />
        </div>
        <div>
          <Label htmlFor="feedback-email">Email</Label>
          <Input
            id="feedback-email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            autoComplete="email"
            placeholder="tu@exemplu.ro"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="feedback-type">Tip de feedback</Label>
        <Select id="feedback-type" name="type" defaultValue="IDEA">
          <option value="IDEA">Idee de îmbunătățire</option>
          <option value="BUG">Bug sau problemă</option>
          <option value="OTHER">Altceva</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="feedback-message">Mesajul tău</Label>
        <textarea
          id="feedback-message"
          name="message"
          required
          rows={5}
          placeholder="Spune-ne ce ți-a plăcut, ce nu merge sau ce ai vrea să adăugăm."
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
        {pending ? "Se trimite…" : "Trimite feedback-ul"}
      </Button>
    </form>
  );
}
