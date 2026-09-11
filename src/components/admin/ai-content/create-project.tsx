"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createProject } from "@/lib/actions/ai-content";
import { useToast } from "@/components/ui/toast";

type Option = { id: string; name: string };

export function CreateContentProject({ subjects }: { subjects: Option[] }) {
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [bacYear, setBacYear] = useState("");

  const submit = () => {
    if (!name.trim() || !subjectId) {
      showToast("Completează numele și materia.");
      return;
    }
    startTransition(async () => {
      const res = await createProject({
        name: name.trim(),
        subjectId,
        bacYear: bacYear ? Number(bacYear) : undefined,
        examType: "SUMMER",
      });
      if (res.ok) {
        showToast("Proiect creat.");
        setName("");
        setBacYear("");
        setOpen(false);
      } else {
        showToast("Eroare: " + (res as { error?: string }).error);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-dark active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" /> Proiect nou
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-feather bg-card p-5">
      <p className="font-extrabold text-ink">Proiect nou BAC</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-subtle">
          Nume proiect
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Română BAC 2027 — Bacalaureat"
            className="mt-1 block w-full rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none transition-colors focus:border-accent"
          />
        </label>
        <label className="block text-sm font-semibold text-subtle">
          Materie
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 block w-full rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none transition-colors focus:border-accent"
          >
            <option value="">Alege materia...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-subtle sm:col-span-2">
          An BAC (opțional)
          <input
            value={bacYear}
            onChange={(e) => setBacYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="ex. 2027"
            inputMode="numeric"
            className="mt-1 block w-full rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none transition-colors focus:border-accent"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-dark active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Creează
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-10 rounded-full px-4 text-sm font-semibold text-subtle hover:bg-ink/5"
        >
          Anulează
        </button>
      </div>
    </div>
  );
}