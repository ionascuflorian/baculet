"use client";

import { useState, useOptimistic, useTransition, useRef } from "react";
import { ListChecks, Plus, Check, Trash2 } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import {
  addTodo,
  toggleTodo,
  deleteTodo,
} from "@/lib/actions/todo";

export interface TodoItemData {
  id: string;
  text: string;
  done: boolean;
  order: number;
}

export function TodoWidget({ items }: { items: TodoItemData[] }) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [optimistic, addOptimistic] = useOptimistic<TodoItemData[], TodoItemData[]>(
    items,
    (_state, next) => next
  );

  const remaining = optimistic.filter((t) => !t.done).length;
  const doneCount = optimistic.filter((t) => t.done).length;

  function handleAdd() {
    const text = draft.trim();
    if (!text || text.length > 200 || pending) return;
    setDraft("");
    setError(null);
    startTransition(async () => {
      addOptimistic([
        ...optimistic,
        {
          id: `tmp-${Date.now()}`,
          text,
          done: false,
          order: optimistic.length + 1,
        },
      ]);
      const res = await addTodo(text);
      if (!res.ok) {
        setError(res.error ?? "Eroare.");
        inputRef.current?.focus();
      }
    });
  }

  function handleToggle(id: string) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      addOptimistic(optimistic.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
      await toggleTodo(id);
    });
  }

  function handleDelete(id: string) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      addOptimistic(optimistic.filter((t) => t.id !== id));
      await deleteTodo(id);
    });
  }

  return (
    <WidgetShell
      title="Sarcini"
      icon={<ListChecks className="size-4 text-accent" />}
      action={
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
          {remaining} rămase
        </span>
      }
    >
      <div className="mb-3 flex gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          maxLength={200}
          placeholder="Adaugă o sarcină…"
          className="inset min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-ink placeholder:text-subtle/70 focus:outline-none focus:ring-2 focus:ring-accent/60"
        />
        <button
          onClick={handleAdd}
          aria-label="Adaugă sarcină"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-white transition hover:bg-accent-dark disabled:opacity-40"
          disabled={!draft.trim() || pending}
        >
          <Plus className="size-5" />
        </button>
      </div>

      {optimistic.length === 0 ? (
        <p className="rounded-xl bg-ink/5 px-3 py-6 text-center text-xs font-semibold text-subtle">
          Nicio sarcină încă. Notează primul pas de învățat.
        </p>
      ) : (
        <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
          {optimistic.map((t) => (
            <li key={t.id} className="group flex items-center gap-2.5">
              <button
                onClick={() => handleToggle(t.id)}
                aria-label={t.done ? "Marchează ca neterminat" : "Marchează ca terminat"}
                className={`grid size-5 shrink-0 place-items-center rounded-md border transition ${
                  t.done
                    ? "border-success bg-success text-white"
                    : "border-feather bg-transparent text-transparent hover:border-accent"
                }`}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </button>
              <span
                className={`min-w-0 flex-1 break-words text-sm font-medium ${
                  t.done ? "text-subtle line-through" : "text-ink"
                }`}
              >
                {t.text}
              </span>
              <button
                onClick={() => handleDelete(t.id)}
                aria-label="Șterge sarcină"
                className="shrink-0 text-subtle opacity-0 transition group-hover:opacity-100 hover:text-danger focus:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {doneCount > 0 && (
        <p className="mt-3 text-xs font-semibold text-subtle">
          {doneCount} finalizat{doneCount === 1 ? "" : "e"} ·{" "}
          {optimistic.length} total
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </WidgetShell>
  );
}
