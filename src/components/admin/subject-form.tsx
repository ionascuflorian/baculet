"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveSubject } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export interface SubjectFormValues {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  profiles: string[];
}

export function SubjectForm({
  subjectId,
  initial,
}: {
  subjectId: string | null;
  initial: SubjectFormValues;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const res = await saveSubject(subjectId, {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: String(formData.get("description") ?? ""),
        icon: String(formData.get("icon") ?? "📘"),
        color: String(formData.get("color") ?? "#58cc02"),
        order: Number(formData.get("order") ?? 0),
        profiles: formData.getAll("profiles").map(String) as (
          | "REAL"
          | "HUMAN"
          | "TECH"
        )[],
      });
      if (!res?.id) return { error: "Eroare la salvare" };
      showToast(subjectId ? "Materia a fost salvată." : "Materia a fost adăugată.");
      router.push("/admin/materii");
      return { error: "" };
    },
    { error: "" }
  );

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Nume materie</Label>
          <Input id="name" name="name" defaultValue={initial.name} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug (se generează automat dacă e gol)</Label>
          <Input id="slug" name="slug" defaultValue={initial.slug} placeholder="matematica" />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descriere</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial.description}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="icon">Iconiță (emoji)</Label>
          <Input id="icon" name="icon" defaultValue={initial.icon} />
        </div>
        <div>
          <Label htmlFor="color">Culoare</Label>
          <input
            id="color"
            type="color"
            name="color"
            defaultValue={initial.color}
            className="h-12 w-full cursor-pointer rounded-xl border-2 border-feather bg-card p-1"
          />
        </div>
        <div>
          <Label htmlFor="order">Ordine</Label>
          <Input
            id="order"
            name="order"
            type="number"
            defaultValue={initial.order}
          />
        </div>
      </div>

      <div>
        <Label>Profile BAC</Label>
        <div className="flex flex-wrap gap-3 pt-1">
          {["REAL", "HUMAN", "TECH"].map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-feather bg-card px-4 py-2.5 text-sm font-bold text-ink"
            >
              <input
                type="checkbox"
                name="profiles"
                value={p}
                defaultChecked={initial.profiles.includes(p)}
                className="h-4 w-4 accent-[#58cc02]"
              />
              {p === "REAL" ? "Real" : p === "HUMAN" ? "Uman" : "Tehnologic"}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {pending ? "Se salvează…" : "Salvează materia"}
      </Button>
    </form>
  );
}
