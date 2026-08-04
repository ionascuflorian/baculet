"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus, X, CalendarDays } from "lucide-react";
import { saveBacSchedule } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BacExamEvent } from "@/lib/site-settings";

export interface BacScheduleFormValues {
  year: number;
  startDate: string;
  endDate: string;
  nextSessionStartDate: string;
  events: BacExamEvent[];
}

export function BacScheduleForm({
  initial,
}: {
  initial: BacScheduleFormValues;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<BacExamEvent[]>(
    initial.events.length
      ? initial.events
      : [{ date: "", title: "" }]
  );
  const [state, action, pending] = useActionState(
    async (_prev: { error: string }, formData: FormData) => {
      const dates = formData.getAll("eventDate").map(String);
      const titles = formData.getAll("eventTitle").map(String);
      const events = dates
        .map((date, i) => ({ date, title: titles[i] ?? "" }))
        .filter((e) => e.date && e.title.trim());

      const res = await saveBacSchedule({
        year: Number(formData.get("year") ?? new Date().getFullYear()),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        nextSessionStartDate: String(
          formData.get("nextSessionStartDate") ?? ""
        ),
        events,
      });
      if (!res.ok) return { error: res.error ?? "Eroare la salvare" };
      router.refresh();
      return { error: "" };
    },
    { error: "" }
  );

  const updateRow = (i: number, patch: Partial<BacExamEvent>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addRow = () => setRows((r) => [...r, { date: "", title: "" }]);
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));

  const inputClass =
    "h-11 w-full rounded-xl border-2 border-feather bg-card px-3 text-sm text-ink focus:outline-none focus:border-accent";

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <p className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="year">Anul BAC</Label>
        <Input
          id="year"
          name="year"
          type="number"
          min={2000}
          max={2100}
          defaultValue={initial.year}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="startDate">Începe BAC-ul</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={initial.startDate || undefined}
          />
          <p className="mt-1 text-xs text-subtle">
            Prima probă (folosită la numărătoarea inversă)
          </p>
        </div>
        <div>
          <Label htmlFor="endDate">Se termină BAC-ul</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={initial.endDate || undefined}
          />
        </div>
        <div>
          <Label htmlFor="nextSessionStartDate">Începe următoarea sesiune</Label>
          <Input
            id="nextSessionStartDate"
            name="nextSessionStartDate"
            type="date"
            defaultValue={initial.nextSessionStartDate || undefined}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-feather bg-background p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold text-ink">Probele la BAC</h3>
        </div>
        <p className="mb-3 text-xs text-subtle">
          Fiecare probă apare în calendarul utilizatorilor, cu data și titlul
          ei.
        </p>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="date"
                name="eventDate"
                value={row.date}
                onChange={(e) => updateRow(i, { date: e.target.value })}
                className="h-11 w-full sm:w-44"
              />
              <Input
                name="eventTitle"
                value={row.title}
                onChange={(e) => updateRow(i, { title: e.target.value })}
                placeholder="Proba (ex: Limba română)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={rows.length <= 1}
                title="Șterge proba"
                aria-label="Șterge proba"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-subtle transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="mt-3"
        >
          <Plus className="h-4 w-4" /> Adaugă o probă
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {pending ? "Se salvează…" : "Salvează datele BAC"}
        </Button>
      </div>
    </form>
  );
}