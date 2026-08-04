"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveExam } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ExamFormValues {
  year: number;
  session: "SUMMER" | "AUTUMN" | "SPECIAL";
  profile: "REAL" | "HUMAN" | "TECH";
  title: string;
  pdfUrl: string;
  solutionUrl: string;
  order: number;
}

const sessionLabels: Record<string, string> = {
  SUMMER: "Sesiunea iunie-iulie",
  AUTUMN: "Sesiunea august-septembrie",
  SPECIAL: "Sesiune specială",
};

const profileLabels: Record<string, string> = {
  REAL: "Real",
  HUMAN: "Uman",
  TECH: "Tehnologic",
};

export function ExamForm({
  subjects,
  subjectId,
  examId,
  initial,
}: {
  subjects: { id: string; name: string }[];
  subjectId: string;
  examId: string | null;
  initial: ExamFormValues;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const res = await saveExam(examId, {
        subjectId: String(formData.get("subjectId") ?? ""),
        year: Number(formData.get("year") ?? 0),
        session: String(formData.get("session") ?? "SUMMER") as "SUMMER",
        profile: String(formData.get("profile") ?? "REAL") as "REAL",
        title: String(formData.get("title") ?? ""),
        pdfUrl: String(formData.get("pdfUrl") ?? ""),
        solutionUrl: String(formData.get("solutionUrl") ?? ""),
        order: Number(formData.get("order") ?? 0),
      });
      if (!res?.id) return { error: "Eroare la salvare" };
      router.push("/admin/subiecte");
      return { error: "" };
    },
    { error: "" }
  );

  const selectClass =
    "h-12 w-full rounded-2xl border-2 border-feather bg-card px-4 text-sm font-semibold text-ink focus:outline-none";

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <Label htmlFor="title">Titlu</Label>
          <Input id="title" name="title" defaultValue={initial.title} required />
        </div>
        <div>
          <Label htmlFor="subjectId">Materie</Label>
          <select id="subjectId" name="subjectId" defaultValue={subjectId} className={selectClass}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="year">An</Label>
          <Input id="year" name="year" type="number" min={2000} max={2100} defaultValue={initial.year} required />
        </div>
        <div>
          <Label htmlFor="session">Sesiune</Label>
          <select id="session" name="session" defaultValue={initial.session} className={selectClass}>
            {Object.entries(sessionLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="profile">Profil</Label>
          <select id="profile" name="profile" defaultValue={initial.profile} className={selectClass}>
            {Object.entries(profileLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pdfUrl">Link subiect (PDF)</Label>
          <Input id="pdfUrl" name="pdfUrl" defaultValue={initial.pdfUrl} placeholder="https://..." required />
        </div>
        <div>
          <Label htmlFor="solutionUrl">Link barem (opțional)</Label>
          <Input id="solutionUrl" name="solutionUrl" defaultValue={initial.solutionUrl} placeholder="https://..." />
        </div>
      </div>
      <div>
        <Label htmlFor="order">Ordine</Label>
        <Input id="order" name="order" type="number" defaultValue={initial.order} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
        {pending ? "Se salvează…" : examId ? "Salvează subiectul" : "Adaugă subiectul"}
      </Button>
    </form>
  );
}
