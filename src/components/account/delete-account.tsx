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
  const ready = confirm.toLowerCase() === email.toLowerCase();

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await deleteAccount(formData);
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
      <Button type="submit" variant="danger" disabled={!ready || pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
        {pending ? "Se șterge…" : "Șterge definitiv contul"}
      </Button>
    </form>
  );
}
