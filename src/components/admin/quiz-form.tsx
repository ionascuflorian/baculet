"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveQuiz } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export interface QuizFormValues {
  title: string;
  slug: string;
  description: string;
  difficulty: number;
  published: boolean;
  order: number;
  chapterId?: string | null;
}

export function QuizForm({
  subjects,
  subjectId,
  quizId,
  initial,
  chapters = [],
  initialChapterId = null,
}: {
  subjects: { id: string; name: string }[];
  subjectId: string;
  quizId: string | null;
  initial: QuizFormValues;
  chapters?: { id: string; title: string }[];
  initialChapterId?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const ch = String(formData.get("chapterId") ?? "");
      const res = await saveQuiz(quizId, {
        subjectId: String(formData.get("subjectId") ?? ""),
        chapterId: ch ? ch : null,
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: String(formData.get("description") ?? ""),
        difficulty: Number(formData.get("difficulty") ?? 1),
        published: formData.get("published") === "on",
        order: Number(formData.get("order") ?? 0),
      });
      if (!res?.id) return { error: "Eroare la salvare" };
      showToast(quizId ? "Testul a fost salvat." : "Testul a fost adăugat.");
      router.push("/admin/teste");
      return { error: "" };
    },
    { error: "" }
  );

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="title">Titlu</Label>
          <Input id="title" name="title" defaultValue={initial.title} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={initial.slug} placeholder="generat automat" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="subjectId">Materie</Label>
          <select
            id="subjectId"
            name="subjectId"
            defaultValue={subjectId}
            className="h-12 w-full rounded-2xl border-2 border-feather bg-card px-4 text-sm font-semibold text-ink focus:outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="chapterId">Capitol (opțional)</Label>
          <select
            id="chapterId"
            name="chapterId"
            defaultValue={initialChapterId ?? ""}
            className="h-12 w-full rounded-2xl border-2 border-feather bg-card px-4 text-sm font-semibold text-ink focus:outline-none"
          >
            <option value="">Fără capitol (global)</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="description">Descriere</Label>
        <Textarea id="description" name="description" defaultValue={initial.description} rows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="difficulty">Dificultate (1–3)</Label>
          <Input id="difficulty" name="difficulty" type="number" min={1} max={3} defaultValue={initial.difficulty} />
        </div>
        <div>
          <Label htmlFor="order">Ordine</Label>
          <Input id="order" name="order" type="number" defaultValue={initial.order} />
        </div>
        <div className="flex items-end">
          <label className="flex h-12 cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input
              type="checkbox"
              name="published"
              defaultChecked={initial.published}
              className="h-4 w-4 accent-[#58cc02]"
            />
            Publicat
          </label>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {pending ? "Se salvează…" : quizId ? "Salvează testul" : "Adaugă testul"}
      </Button>
    </form>
  );
}
