"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteAccount } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccount({ email }: { email: string }) {
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ready = confirm.toLowerCase() === email.toLowerCase();

  return (
    <form
      action={async (formData) => {
        setPending(true);
        setError("");
        try {
          await deleteAccount(formData);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "A apărut o problemă la ștergerea contului."
          );
        } finally {
          // Dacă redirect-ul nu are loc (ex. totul a mers, dar redirecția
          // cedează), readucem butonul la starea normală.
          setPending(false);
        }
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="confirmEmail">
          Scrie <span className="font-bold text-ink">{email}</span> pentru a
          confirma
        </Label>
        <Input
          id="confirmEmail"
          name="confirmEmail"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={email}
          required
        />
      </div>
      {error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="danger" disabled={!ready || pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
        {pending ? "Se șterge…" : "Șterge definitiv contul"}
      </Button>
    </form>
  );
}
