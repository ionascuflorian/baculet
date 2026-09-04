"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import {
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
  type PointerSensorOptions,
  type Sensors,
} from "@dnd-kit/dom";
import { GripVertical, Plus, Pencil, Trash2, Clock, FileText, Wand2 } from "lucide-react";
import { reorderLessonSteps, deleteSection, generateSectionsFromLesson } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SectionForm } from "@/components/admin/section-form";
import {
  KIND_META,
  sectionKind,
  type QuizOptionDto,
  type SectionDto,
} from "@/components/admin/section-types";

function applyReorder<T extends { id: string }>(items: T[], sourceId: string, targetId: string): T[] {
  const fromIndex = items.findIndex((i) => i.id === sourceId);
  const toIndex = items.findIndex((i) => i.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  subjectName: string;
  lessonContent: string;
  sections: SectionDto[];
  quizzes: QuizOptionDto[];
}

export function SectionConstructor({
  lessonId,
  lessonTitle,
  subjectName,
  lessonContent,
  sections,
  quizzes,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [sectionsState, setSectionsState] = useState<SectionDto[]>(sections);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setSectionsState(sections);
  }, [sections]);
  const [formState, setFormState] = useState<
    | { type: "create" }
    | { type: "edit"; section: SectionDto }
    | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();

  const pointerSensorOptions: PointerSensorOptions = {
    activationConstraints: () => [new PointerActivationConstraints.Distance({ value: 5 })],
  };

  const dragSensors: Sensors = useMemo(
    () => [
      { plugin: PointerSensor, options: pointerSensorOptions },
      { plugin: KeyboardSensor },
    ],
    []
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId((event.operation.source?.id as string | undefined) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (event.canceled) return;
    const source = event.operation.source;
    const target = event.operation.target;
    if (!source || !target) return;
    const sourceId = source.id as string;
    const targetId = target.id as string;

    const prev = sectionsState;
    const next = applyReorder(prev, sourceId, targetId);
    if (next === prev) return;
    setSectionsState(next);
    try {
      await reorderLessonSteps(lessonId, next.map((s) => s.id));
      router.refresh();
    } catch (e) {
      setSectionsState(prev);
      showToast(e instanceof Error ? e.message : "Eroare la reordonare.");
    }
  };

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteSection(id, lessonId);
      setSectionsState((prev) => prev.filter((s) => s.id !== id));
      showToast("Secțiunea a fost ștearsă.");
      router.refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Eroare la ștergere.");
    } finally {
      setDeletingId(null);
    }
  }

  const sectionsForOverlay = sectionsState;

  function handleGenerate() {
    startGenerating(async () => {
      try {
        const res = await generateSectionsFromLesson(lessonId);
        showToast(`S-au generat/actualizat ${res.count} secțiuni.`);
        router.refresh();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Eroare la generarea secțiunilor.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {lessonContent.trim() && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-widest text-accent">
              Conținutul lecției
            </p>
            <p className="mt-0.5 text-xs font-semibold text-subtle">
              Textul din editor, fără anteturi <code className="rounded bg-card px-1">##</code>, se
              împarte automat în secțiuni pe paragrafe. Secțiunile construite manual nu se ating.
            </p>
          </div>
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="shrink-0"
            disabled={generating}
            onClick={handleGenerate}
          >
            <Wand2 className="h-4 w-4" /> {generating ? "Generez…" : "Generează secțiuni"}
          </Button>
        </div>
      )}

      <DragDropProvider
        sensors={dragSensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-3">
          {sectionsState.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-feather p-8 text-center">
              <p className="text-sm font-extrabold text-ink">Începe cu prima secțiune</p>
              <p className="mt-1 text-xs font-semibold text-subtle">
                Tiparul recomandat: <b className="text-sky-600">Teorie</b> →{" "}
                <b className="text-orange-500">Exercițiu</b> →{" "}
                <b className="text-sky-600">Teorie</b> →{" "}
                <b className="text-orange-500">Exercițiu</b>. Pașii se afișează elevilor în această
                ordine, cu timer de citire la teorie.
              </p>
            </div>
          )}

          {sectionsState.map((section, index) => (
            <SortableSectionCard
              key={section.id}
              section={section}
              index={index}
              deleting={deletingId === section.id}
              onEdit={() => setFormState({ type: "edit", section })}
              onDelete={() => handleDelete(section.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="pointer-events-none w-full max-w-xl">
              <MiniCard section={sectionsForOverlay.find((s) => s.id === activeId)} />
            </div>
          ) : null}
        </DragOverlay>
      </DragDropProvider>

      <Button
        type="button"
        variant="accent"
        className="w-full"
        onClick={() => setFormState({ type: "create" })}
      >
        <Plus className="h-4 w-4" /> Adaugă secțiune nouă
      </Button>

      {formState && (
        <SectionForm
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          subjectName={subjectName}
          lessonContent={lessonContent}
          section={formState.type === "edit" ? formState.section : null}
          quizzes={quizzes}
          onDone={() => setFormState(null)}
        />
      )}
    </div>
  );
}

function SortableSectionCard({
  section,
  index,
  deleting,
  onEdit,
  onDelete,
}: {
  section: SectionDto;
  index: number;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const handleRef = useRef<HTMLButtonElement>(null);
  const { ref, isDragging } = useSortable({
    id: section.id,
    index,
    handle: handleRef,
    plugins: [SortableKeyboardPlugin],
    transition: null,
  });
  const kind = sectionKind(section);
  const meta = KIND_META[kind];

  return (
    <div
      ref={ref}
      className={`group relative rounded-2xl border bg-card p-4 transition-opacity ${meta.border} ${deleting ? "opacity-50" : ""} ${isDragging ? "opacity-70 ring-2 ring-accent/50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          ref={handleRef}
          type="button"
          aria-label="Trage pentru reordonare"
          className="mt-1 flex h-8 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-subtle hover:bg-feather hover:text-ink active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-feather text-[11px] font-extrabold text-ink">
              {index + 1}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${meta.badge}`}>
              {meta.label}
            </span>
            {section.manual ? (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-extrabold text-accent">
                Construcție manuală
              </span>
            ) : (
              <span className="rounded-full bg-feather px-2 py-0.5 text-[10px] font-extrabold text-subtle">
                Din markdown
              </span>
            )}
          </div>

          <p className="truncate text-sm font-extrabold text-ink">
            {section.title ?? "(fără titlu)"}
          </p>

          {section.quiz ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-subtle">
              <FileText className="h-3.5 w-3.5" />
              {section.quiz.title} · {section.quiz.questionCount} întrebări
            </p>
          ) : (
            <p className="mt-1 line-clamp-1 text-xs font-medium text-subtle">
              {section.content.slice(0, 120) || "—"}
            </p>
          )}

          {(kind === "theory" || kind === "example") && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-subtle">
              <Clock className="h-3 w-3" /> {section.minReadTime}s citire minim
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:bg-feather hover:text-ink"
            aria-label="Editează secțiunea"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:bg-danger/10 hover:text-danger"
            aria-label="Șterge secțiunea"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ section }: { section?: SectionDto }) {
  if (!section) return null;
  const meta = KIND_META[sectionKind(section)];
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border-2 bg-card p-3 shadow-lg ${meta.border}`}
    >
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${meta.badge}`}>
        {meta.label}
      </span>
      <span className="truncate text-sm font-bold text-ink">
        {section.title ?? "(fără titlu)"}
      </span>
    </div>
  );
}