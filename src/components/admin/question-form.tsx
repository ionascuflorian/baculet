"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveQuestion } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export interface QuestionFormValues {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type: string;
  concept: string;
  order: number;
}

export function QuestionForm({
  quizId,
  questionId,
  initial,
}: {
  quizId: string;
  questionId: string | null;
  initial: QuestionFormValues;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const options = [];
      for (let i = 0; i < 6; i++) {
        const value = String(formData.get(`option_${i}`) ?? "").trim();
        if (value) options.push(value);
      }
      if (options.length < 2) return { error: "Adaugă cel puțin 2 variante de răspuns." };
      const res = await saveQuestion(questionId, {
        quizId,
        text: String(formData.get("text") ?? ""),
        options,
        correctIndex: Number(formData.get("correctIndex") ?? 0),
        explanation: String(formData.get("explanation") ?? ""),
        type: String(formData.get("type") ?? "SINGLE") as "SINGLE" | "CLOZE" | "FLASHCARD" | "DRAG_DROP",
        concept: String(formData.get("concept") ?? ""),
        order: Number(formData.get("order") ?? 0),
      });
      if (!res?.id) return { error: "Eroare la salvare" };
      showToast(questionId ? "Întrebarea a fost salvată." : "Întrebarea a fost adăugată.");
      router.push(`/admin/teste/${quizId}`);
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
      <div>
        <Label htmlFor="text">Enunț</Label>
        <Textarea id="text" name="text" defaultValue={initial.text} rows={3} required />
      </div>

      <div className="space-y-2">
        <Label>Variante de răspuns</Label>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const value = initial.options[i] ?? "";
          return (
            <div key={i} className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-subtle">
                <input
                  type="radio"
                  name="correctIndex"
                  value={i}
                  defaultChecked={initial.correctIndex === i}
                  className="h-4 w-4 accent-[#58cc02]"
                />
                corect
              </label>
              <Input
                name={`option_${i}`}
                defaultValue={value}
                placeholder={i === 0 ? "Varianta A" : i === 1 ? "Varianta B" : i === 2 ? "Varianta C" : `Varianta ${String.fromCharCode(65 + i)}`}
              />
            </div>
          );
        })}
        <p className="text-xs text-subtle">
          Alege radioul din dreapta variantei corecte. Liniile goale sunt ignorate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="type">Tip</Label>
          <select id="type" name="type" defaultValue={initial.type ?? "SINGLE"} className="h-12 w-full rounded-2xl border-2 border-feather bg-card px-4 text-sm font-semibold text-ink">
            <option value="SINGLE">SINGLE (grilă)</option>
            <option value="CLOZE">CLOZE (completare)</option>
            <option value="FLASHCARD">FLASHCARD</option>
            <option value="DRAG_DROP">DRAG_DROP</option>
          </select>
        </div>
        <div>
          <Label htmlFor="concept">Concept (etichetă recap)</Label>
          <Input id="concept" name="concept" defaultValue={initial.concept ?? ""} placeholder="ex. functii-grad1-radacina" />
        </div>
        <div>
          <Label htmlFor="order">Ordine</Label>
          <Input id="order" name="order" type="number" defaultValue={initial.order} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        <div>
          <Label htmlFor="explanation">Explicație (opțional)</Label>
          <Textarea id="explanation" name="explanation" defaultValue={initial.explanation} rows={2} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {pending ? "Se salvează…" : questionId ? "Salvează întrebarea" : "Adaugă întrebarea"}
      </Button>
    </form>
  );
}
