"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sun, Moon } from "lucide-react";
import { saveTheme } from "@/lib/actions/themes";
import {
  PALETTE_KEYS,
  PALETTE_LABELS,
  defaultPalette,
  defaultDarkPalette,
  type Palette,
} from "@/components/themes/palette";
import { ThemePreview } from "@/components/themes/theme-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ThemeFormValues = {
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  order: number;
  light: Palette;
  dark: Palette;
};

export function ThemeForm({
  themeId,
  initial,
}: {
  themeId: string | null;
  initial: ThemeFormValues;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [description, setDescription] = useState(initial.description);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [order, setOrder] = useState(initial.order);
  const [light, setLight] = useState<Palette>(initial.light);
  const [dark, setDark] = useState<Palette>(initial.dark);
  const [mode, setMode] = useState<"light" | "dark">("light");

  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const res = await saveTheme(themeId, {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: String(formData.get("description") ?? ""),
        enabled: formData.get("enabled") === "on",
        order: Number(formData.get("order") ?? 0),
        light,
        dark,
      });
      if (res.error) return { error: res.error };
      router.push("/admin/teme");
      router.refresh();
      return { error: "" };
    },
    { error: "" }
  );

  const setColor = (which: "light" | "dark", key: string, value: string) => {
    if (which === "light") setLight((p) => ({ ...p, [key]: value }));
    else setDark((p) => ({ ...p, [key]: value }));
  };

  const renderPalette = (which: "light" | "dark") => {
    const palette = which === "light" ? light : dark;
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PALETTE_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{PALETTE_LABELS[key]}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={palette[key] ?? "#000000"}
                onChange={(e) => setColor(which, key, e.target.value)}
                className="h-9 w-11 cursor-pointer rounded-lg border border-feather bg-card p-1"
                aria-label={`${PALETTE_LABELS[key]} (${which === "light" ? "luminos" : "întunecat"})`}
              />
              <code className="text-[11px] text-subtle">
                {(palette[key] ?? "").toUpperCase()}
              </code>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Nume</Label>
          <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug (opțional, auto-generat din nume)</Label>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: ocean"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descriere (opțional)</Label>
        <Input
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Scurtă descriere a temei"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-feather px-4 py-3">
          <input
            type="checkbox"
            name="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-[--accent]"
          />
          <span className="text-sm font-semibold text-ink">Activă (vizibilă utilizatorilor)</span>
        </label>
        <div>
          <Label htmlFor="order">Ordine</Label>
          <Input
            id="order"
            name="order"
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-feather bg-background p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Previzualizare</h3>
          <div className="flex items-center gap-0.5 rounded-full bg-card p-0.5 shadow-sm">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  mode === m ? "bg-accent text-white" : "text-subtle hover:text-ink"
                )}
              >
                {m === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {m === "light" ? "Luminos" : "Întunecat"}
              </button>
            ))}
          </div>
        </div>
        <ThemePreview palette={mode === "light" ? light : dark} />
      </div>

      <div className="rounded-2xl border border-feather bg-background p-4">
        <h3 className="mb-4 text-sm font-bold text-ink">Paletă — mod luminos</h3>
        {renderPalette("light")}
      </div>

      <div className="rounded-2xl border border-feather bg-background p-4">
        <h3 className="mb-4 text-sm font-bold text-ink">Paletă — mod întunecat</h3>
        {renderPalette("dark")}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => { setLight(defaultPalette()); setDark(defaultDarkPalette()); }}>
          Resetează paletele
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {pending ? "Se salvează…" : themeId ? "Salvează tema" : "Adaugă tema"}
        </Button>
      </div>
    </form>
  );
}