"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveChapter } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export interface ChapterFormValues {
  title: string;
  slug: string;
  description: string;
  order: number;
}

export function ChapterForm({
  subjectId,
  chapterId,
  initial,
}: {
  subjectId: string;
  chapterId: string | null;
  initial: ChapterFormValues;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const res = await saveChapter(chapterId, {
        subjectId,
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: String(formData.get("description") ?? ""),
        order: Number(formData.get("order") ?? 0),
      });
      if (!res?.id) return { error: "Eroare la salvare" };
      showToast(chapterId ? "Capitolul a fost salvat." : "Capitolul a fost adăugat.");
      router.push(`/admin/materii/${subjectId}`);
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
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_100px]">
        <div>
          <Label htmlFor="title">Titlu</Label>
          <Input id="title" name="title" defaultValue={initial.title} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={initial.slug} placeholder="generat automat" />
        </div>
        <div>
          <Label htmlFor="order">Ordine</Label>
          <Input id="order" name="order" type="number" defaultValue={initial.order} />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Descriere</Label>
        <Textarea id="description" name="description" defaultValue={initial.description} rows={2} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {pending ? "Se salvează…" : chapterId ? "Salvează capitolul" : "Adaugă capitolul"}
      </Button>
    </form>
  );
}
