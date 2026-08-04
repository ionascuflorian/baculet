"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(register, {});

  return (
    <div className="w-full max-w-md rounded-3xl border-2 border-feather bg-card p-6 shadow-sm sm:p-8">
      <h1 className="mb-1 text-2xl font-extrabold text-ink">
        Creează-ți contul
      </h1>
      <p className="mb-6 text-sm text-subtle">
        Gratuit, în 30 de secunde. Vei primi un cod pe email pentru a activa
        contul, apoi pornești la drum spre BAC.
      </p>

      {googleEnabled && (
        <>
          <GoogleButton />
          <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-subtle">
            <span className="h-px flex-1 bg-feather" />
            sau
            <span className="h-px flex-1 bg-feather" />
          </div>
        </>
      )}

      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="name">Nume</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Andrei Popescu"
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@exemplu.ro"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Parolă</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minim 6 caractere"
            required
          />
        </div>

        {state.error && (
          <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {state.error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="h-5 w-5 animate-spin" />}
          {pending ? "Se creează contul…" : "Creează cont"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-subtle">
        Preferi să te conectezi cu un cod?{" "}
        <Link href="/login" className="font-bold text-accent">
          Autentifică-te aici
        </Link>
      </p>
    </div>
  );
}
