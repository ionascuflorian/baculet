"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Eye } from "lucide-react";
import { saveLesson } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownPreview } from "@/components/admin/markdown-preview";

export interface LessonFormValues {
  title: string;
  slug: string;
  content: string;
  videoUrl: string;
  pdfUrl: string;
  order: number;
}

export function LessonForm({
  chapterId,
  lessonId,
  initial,
}: {
  chapterId: string;
  lessonId: string | null;
  initial: LessonFormValues;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initial.content);
  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const res = await saveLesson(lessonId, {
        chapterId,
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        content: String(formData.get("content") ?? ""),
        videoUrl: String(formData.get("videoUrl") ?? ""),
        pdfUrl: String(formData.get("pdfUrl") ?? ""),
        order: Number(formData.get("order") ?? 0),
      });
      if (!res?.id) return { error: "Eroare la salvare" };
      router.push(`/admin/capitole/${chapterId}`);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="videoUrl">Link video (YouTube, opțional)</Label>
          <Input id="videoUrl" name="videoUrl" defaultValue={initial.videoUrl} placeholder="https://youtube.com/..." />
        </div>
        <div>
          <Label htmlFor="pdfUrl">Link PDF (opțional)</Label>
          <Input id="pdfUrl" name="pdfUrl" defaultValue={initial.pdfUrl} placeholder="https://..." />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <Label htmlFor="content">Conținut (Markdown)</Label>
          <span className="flex items-center gap-1 text-xs font-semibold text-subtle">
            <Eye className="h-3.5 w-3.5" /> Previizualizare mai jos
          </span>
        </div>
        <Textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          className="font-mono text-sm"
        />
      </div>
      <MarkdownPreview markdown={content} />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {pending ? "Se salvează…" : lessonId ? "Salvează lecția" : "Adaugă lecția"}
      </Button>
    </form>
  );
}
