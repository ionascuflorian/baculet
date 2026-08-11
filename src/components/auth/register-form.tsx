"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/auth/google-button";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(register, {});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Parolă</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Minim 6 caractere"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {showPassword ? (
                <EyeOff className="h-4.5 w-4.5" />
              ) : (
                <Eye className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-feather bg-card p-3.5 transition-colors hover:border-accent/40">
          <input
            type="checkbox"
            name="terms"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[--accent]"
            required
          />
          <span className="text-sm leading-relaxed text-subtle">
            Am citit și sunt de acord cu{" "}
            <Link
              href="/termeni"
              target="_blank"
              className="font-bold text-accent hover:underline"
            >
              Termenii și Condițiile
            </Link>
            .
          </span>
        </label>

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
