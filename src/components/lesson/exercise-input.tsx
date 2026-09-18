"use client";

import { useState } from "react";
import { ImageOff, Trash2 } from "lucide-react";
import type { Exercise } from "@/lib/lesson/exercise-schema";
import { TRUE_FALSE_OPTIONS, optionLetter } from "@/lib/lesson/exercise-schema";
import { cn } from "@/lib/utils";

interface Props {
  exercise: Exercise;
  value: unknown;
  onChange: (raw: unknown | null) => void;
  disabled?: boolean;
}

export function ExerciseInput({ exercise, value, onChange, disabled }: Props) {
  const kind = exercise.kind;
  if (kind === "single") return <SingleChoices options={exercise.options} value={value as number | null} onChange={onChange} disabled={disabled} />;
  if (kind === "true_false") return <SingleChoices options={TRUE_FALSE_OPTIONS} value={value as number | null} onChange={onChange} disabled={disabled} />;
  if (kind === "image_choice") return <ImageChoices options={exercise.options} value={value as number | null} onChange={onChange} disabled={disabled} />;
  if (kind === "multiple") return <MultipleChoices options={exercise.options} value={value as number[] | null} onChange={onChange} disabled={disabled} />;
  if (kind === "fill_blank") return <FillBlank value={value as string | null} onChange={onChange} disabled={disabled} />;
  if (kind === "matching") return <Matching exercise={exercise} value={value as [number, number][] | null} onChange={onChange} disabled={disabled} />;
  if (kind === "ordering") return <Ordering options={exercise.options} value={value as number[] | null} onChange={onChange} disabled={disabled} />;
  return <Classification exercise={exercise} value={value as Record<string, number[]> | null} onChange={onChange} disabled={disabled} />;
}

function optionClass(selected: boolean, disabled?: boolean) {
  return cn(
    "rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-all flex items-center gap-2.5",
    disabled ? "pointer-events-none opacity-70" : "cursor-pointer",
    selected
      ? "border-accent bg-accent/10 ring-2 ring-accent/20"
      : "border-feather hover:border-accent/40 active:scale-[0.99]"
  );
}

function OptionBadge({ letter, selected }: { letter: string; selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
        selected ? "bg-accent text-white" : "bg-ink/5"
      )}
    >
      {letter}
    </span>
  );
}

function SingleChoices({ options, value, onChange, disabled }: { options: Exercise["options"]; value: number | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Alege răspunsul" className="grid gap-2">
      {options.map((opt, i) => {
        const selected = value === i;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(i)}
            className={optionClass(selected, disabled)}
          >
            <OptionBadge letter={optionLetter(i)} selected={selected} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ImageChoices({ options, value, onChange, disabled }: { options: Exercise["options"]; value: number | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Alege imaginea" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((opt, i) => {
        const selected = value === i;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(i)}
            className={cn(
              "overflow-hidden rounded-2xl border-2 text-left transition-all",
              disabled ? "pointer-events-none opacity-70" : "cursor-pointer",
              selected ? "border-accent ring-2 ring-accent/20" : "border-feather hover:border-accent/40"
            )}
          >
            {opt.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opt.imageUrl} alt={opt.label} className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-feather/60 text-subtle">
                <ImageOff className="h-6 w-6" />
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-ink">
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold", selected ? "bg-accent text-white" : "bg-ink/5")}>{optionLetter(i)}</span>
              <span className="truncate">{opt.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MultipleChoices({ options, value, onChange, disabled }: { options: Exercise["options"]; value: number[] | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  const sel = new Set(value ?? []);
  return (
    <div className="grid gap-2">
      {options.map((opt, i) => {
        const selected = sel.has(i);
        return (
          <button
            key={i}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => {
              const next = new Set(sel);
              if (next.has(i)) next.delete(i);
              else next.add(i);
              onChange([...next]);
            }}
            className={optionClass(selected, disabled)}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs font-extrabold",
                selected ? "border-accent bg-accent text-white" : "border-feather bg-ink/5"
              )}
            >
              {selected ? "✓" : optionLetter(i)}
            </span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FillBlank({ value, onChange, disabled }: { value: string | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      disabled={disabled}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Scrie răspunsul…"
      className="w-full rounded-xl border-2 border-feather bg-card px-4 py-3 text-sm font-semibold text-ink outline-none transition-all placeholder:text-subtle/60 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:pointer-events-none disabled:opacity-70"
    />
  );
}

function Matching({ exercise, value, onChange, disabled }: { exercise: Exercise; value: [number, number][] | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  const scheme = exercise.answer;
  const leftCount =
    scheme && "leftCount" in scheme && typeof scheme.leftCount === "number"
      ? scheme.leftCount
      : Math.ceil(exercise.options.length / 2);
  const left = exercise.options.slice(0, leftCount);
  const right = exercise.options.slice(leftCount);
  const pairs = new Map<number, number>((value ?? []).map(([l, r]) => [l, r]));
  const [activeLeft, setActiveLeft] = useState<number | null>(null);

  const rightLetter = (i: number) => String.fromCharCode(65 + leftCount + i);

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-subtle">
        Atinge un element din stânga, apoi asociază-l cu unul din dreapta. Poți reface asocierile.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {left.map((opt, li) => {
            const paired = pairs.get(li) ?? null;
            const active = activeLeft === li;
            return (
              <button
                key={li}
                type="button"
                disabled={disabled}
                onClick={() => setActiveLeft(active ? null : li)}
                className={cn(
                  "w-full rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition-all",
                  disabled ? "pointer-events-none opacity-70" : "cursor-pointer",
                  active ? "border-accent bg-accent/10 ring-2 ring-accent/20" : "border-feather hover:border-accent/40",
                  paired !== null && "opacity-90"
                )}
              >
                <div className="flex items-center gap-2">
                  <OptionBadge letter={optionLetter(li)} selected={active} />
                  <span className="flex-1">{opt.label}</span>
                  {paired !== null && (
                    <span className="rounded-lg bg-success/10 px-2 py-0.5 text-xs font-extrabold text-success">
                      {rightLetter(paired)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {right.map((opt, ri) => (
            <button
              key={ri}
              type="button"
              disabled={disabled || activeLeft === null}
              onClick={() => {
                if (activeLeft === null) return;
                const next = new Map(pairs);
                next.set(activeLeft, ri);
                onChange([...next.entries()].map(([l, r]) => [l, r]));
                setActiveLeft(null);
              }}
              className={cn(
                "w-full rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition-all",
                disabled || activeLeft === null ? "pointer-events-none opacity-60" : "cursor-pointer hover:border-accent/40",
                activeLeft !== null && !disabled ? "border-accent/30" : "border-feather"
              )}
            >
              <div className="flex items-center gap-2">
                <OptionBadge letter={rightLetter(ri)} selected={false} />
                <span className="flex-1">{opt.label}</span>
                {[...pairs.values()].includes(ri) && (
                  <span className="text-xs font-extrabold text-subtle">✓ asociat</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
      {pairs.size > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([])}
          className="flex items-center gap-1.5 text-xs font-bold text-subtle hover:text-danger transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Resetează asocierile
        </button>
      )}
    </div>
  );
}

function Ordering({ options, value, onChange, disabled }: { options: Exercise["options"]; value: number[] | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  const order = (value ?? []) as number[];
  const doneSet = new Set(order);
  const remaining = options.map((_, i) => i).filter((i) => !doneSet.has(i));
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-subtle">Atinge elementele în ordinea corectă.</p>
      {order.length > 0 && (
        <ol className="space-y-2">
          {order.map((idx, pos) => (
            <li key={idx}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(order.filter((v) => v !== idx))}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border-2 border-accent/40 bg-accent/10 px-3 py-2 text-left text-sm font-semibold transition-all",
                  disabled ? "pointer-events-none opacity-70" : "cursor-pointer hover:border-accent"
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-white">{pos + 1}</span>
                <span className="flex-1">{options[idx].label}</span>
                <span className="text-xs font-extrabold text-accent">{optionLetter(idx)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        {remaining.map((idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onChange([...order, idx])}
            className={cn(
              "rounded-xl border-2 border-feather px-3 py-1.5 text-sm font-semibold transition-all",
              disabled ? "pointer-events-none opacity-70" : "cursor-pointer hover:border-accent/40 active:scale-[0.98]"
            )}
          >
            {options[idx].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Classification({ exercise, value, onChange, disabled }: { exercise: Exercise; value: Record<string, number[]> | null; onChange: (v: unknown) => void; disabled?: boolean }) {
  const scheme = exercise.answer;
  const categories =
    scheme && "buckets" in scheme && typeof scheme.buckets === "object"
      ? Object.keys(scheme.buckets)
      : (exercise.categories ?? ["Corect", "Greșit"]);
  const buckets = value ?? {};
  const placed = new Set(Object.values(buckets).flat());
  const remaining = exercise.options.map((_, i) => i).filter((i) => !placed.has(i));
  const [selected, setSelected] = useState<number | null>(null);

  const place = (cat: string) => {
    if (selected === null) return;
    const next: Record<string, number[]> = {};
    for (const [k, v] of Object.entries(buckets)) next[k] = [...v];
    next[cat] = [...(next[cat] ?? []), selected];
    onChange(next);
    setSelected(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-subtle">
        Atinge un element, apoi alege categoria din dreapta.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-wrap content-start gap-2">
          {remaining.map((idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(selected === idx ? null : idx)}
              className={cn(
                "rounded-xl border-2 px-3 py-1.5 text-sm font-semibold transition-all",
                disabled ? "pointer-events-none opacity-70" : "cursor-pointer",
                selected === idx ? "border-accent bg-accent/10 ring-2 ring-accent/20" : "border-feather hover:border-accent/40"
              )}
            >
              {exercise.options[idx].label}
            </button>
          ))}
        </div>
        <div className="grid content-start gap-2">
          {categories.map((cat) => {
            const items = buckets[cat] ?? [];
            return (
              <div
                key={cat}
                onClick={() => place(cat)}
                className={cn(
                  "rounded-xl border-2 p-2 transition-all",
                  selected !== null && !disabled ? "cursor-pointer border-accent/40 hover:bg-accent/10" : "border-feather",
                  items.length > 0 && "bg-feather/40"
                )}
              >
                <p className="px-1 py-0.5 text-xs font-extrabold uppercase tracking-widest text-accent">{cat}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {items.map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        const next: Record<string, number[]> = {};
                        for (const [k, v] of Object.entries(buckets)) next[k] = v.filter((x) => x !== idx);
                        next[cat] = (next[cat] ?? []).filter((x) => x !== idx);
                        onChange(next);
                      }}
                      className="rounded-lg bg-card px-2 py-1 text-xs font-bold text-ink shadow-sm hover:text-danger"
                    >
                      {exercise.options[idx].label} ✕
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}