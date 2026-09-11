"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { upload as blobUpload } from "@vercel/blob/client";
import {
  Check,
  Eye,
  FileText,
  HelpCircle,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  generateCurriculum,
  addCurriculumNode,
  saveCurriculumNode,
  deleteCurriculumNode,
  generateItem,
  updateItemDraft,
  regenerateItemPart,
  validateItem,
  approveItem,
  rejectItem,
  publishItem,
  setSourcePriority,
  deleteSource,
} from "@/lib/actions/ai-content";
import { useToast } from "@/components/ui/toast";
import { AssistantPanel } from "@/components/admin/ai-content/assistant-panel";
import { DraftPreview } from "@/components/admin/ai-content/draft-preview";
import { cn } from "@/lib/utils";

export type AiContentProjectData = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  bacYear: number | null;
  examType: string | null;
  subject: { name: string };
  sources: Array<{
    id: string;
    originalName: string;
    mime: string;
    size: number;
    priority: string;
    status: string;
    pageCount: number | null;
    charCount: number | null;
    error: string | null;
    createdAt: Date;
  }>;
  nodes: Array<{
    id: string;
    kind: string;
    parentId: string | null;
    title: string;
    description: string | null;
    order: number;
    manual: boolean;
    mappedId: string | null;
  }>;
  items: Array<{
    id: string;
    nodeId: string | null;
    type: string;
    status: string;
    title: string;
    draft: unknown;
    validation: unknown;
    versions: unknown;
    sourceRefs: unknown;
    note: string | null;
    version: number;
    publishedAt: Date | null;
    updatedAt: Date;
  }>;
  activities: Array<{ id: string; action: string; detail: unknown; createdAt: Date }>;
  jobs: Array<{
    id: string;
    kind: string;
    status: string;
    error: string | null;
    createdAt: Date;
    finishedAt: Date | null;
  }>;
  _count: { chunks: number };
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  ANALYZING: "Se analizează",
  READY_FOR_REVIEW: "Gata de revizuire",
  GENERATING: "Se generează",
  VALIDATING: "Se validează",
  NEEDS_REVIEW: "Necesită revizuire",
  APPROVED: "Aprobat",
  PUBLISHED: "Publicat",
  FAILED: "Eroare",
};

const sourceStatusLabels: Record<string, string> = {
  UPLOADED: "Încărcat",
  PROCESSING: "Se procesează",
  READY: "Gata",
  FAILED: "Eroare",
};

const priorityLabels: Record<string, string> = {
  OFFICIAL: "Oficial",
  HIGH: "Ridicat",
  NORMAL: "Normal",
  REFERENCE: "Referință",
};

const kindLabels: Record<string, string> = {
  CHAPTER: "Capitol",
  UNIT: "Unitate",
  CONCEPT: "Concept",
};

const typeLabels: Record<string, string> = {
  LESSON: "Lecție",
  QUIZ: "Quiz",
  CHECKPOINT: "Checkpoint",
};

const PRIORITIES = ["OFFICIAL", "HIGH", "NORMAL", "REFERENCE"];

function fullDate(v: string | Date | null): string {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function prettyJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}

async function runAction(showToast: (m: string) => void, fn: () => Promise<{ ok?: boolean; error?: string }>) {
  try {
    const res = await fn();
    if (res.ok === false) {
      showToast(res.error || "Operațiune eșuată.");
      return false;
    }
    return true;
  } catch (err) {
    showToast(err instanceof Error ? err.message : "Operațiune eșuată.");
    return false;
  }
}

function ActionButton({
  pending,
  onClick,
  children,
  variant = "default",
  small = false,
  disabled,
  title,
}: {
  pending: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "danger" | "accent";
  small?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  const cls: Record<string, string> = {
    default: "bg-accent text-white hover:bg-accent-dark",
    outline: "border border-feather text-ink hover:bg-ink/5",
    ghost: "text-subtle hover:bg-ink/5",
    danger: "bg-danger/10 text-danger hover:bg-danger/20",
    accent: "bg-accent/10 text-accent hover:bg-accent/15",
  };
  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold transition-all active:scale-[0.98] disabled:opacity-50",
        small ? "px-3 py-1.5 text-xs" : "h-10 px-4 text-sm",
        cls[variant]
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </button>
  );
}

export function AiContentProjectStudio({ project }: { project: AiContentProjectData }) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<string>("surse");
  const [helpOpen, setHelpOpen] = useState(false);

  const tabs: Array<{ id: string; label: string }> = [
    { id: "surse", label: `Surse (${project.sources.length})` },
    { id: "plan", label: `Plan (${project.nodes.length})` },
    { id: "continut", label: `Conținut (${project.items.length})` },
    { id: "activitate", label: "Activitate" },
    { id: "asistent", label: "Asistent AI" },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-ink">{project.name}</h1>
          <p className="mt-1 text-subtle">
            {project.subject.name}
            {project.bacYear ? ` · BAC ${project.bacYear}` : ""}
            {project.examType ? ` · ${project.examType}` : ""}
            {" · "}
            {project._count.chunks} chunks procesate
          </p>
          <span className="mt-2 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            {statusLabels[project.status] ?? project.status}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-feather bg-card px-4 text-sm font-semibold text-subtle transition-all hover:bg-ink/5 active:scale-[0.98]"
        >
          <HelpCircle className="h-4 w-4" />
          Ajutor
        </button>
      </section>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-[0.98]",
              tab === t.id ? "bg-accent text-white" : "bg-card text-subtle hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "surse" && <SourcesTab project={project} showToast={showToast} />}
      {tab === "plan" && <PlanTab project={project} showToast={showToast} />}
      {tab === "continut" && <ContentTab project={project} showToast={showToast} />}
      {tab === "activitate" && <ActivityTab project={project} />}
      {tab === "asistent" && <AssistantPanel projectId={project.id} projectName={project.name} />}

      {helpOpen && <StudioHelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

const HELP_STEPS: Array<{ title: string; body: string }> = [
  {
    title: "1. Încarcă o sursă",
    body: "Adaugă un PDF, DOCX, TXT sau fișier Markdown în fila „Surse”. Aici pui materialul din care vrei să construim conținutul.",
  },
  {
    title: "2. Procesează sursa",
    body: "Apasă „Procesează” pe sursă. Extragem textul și îl împărțim în fragmente (chunks), pe care AI le folosește ca referință.",
  },
  {
    title: "3. Generează planul",
    body: "În fila „Plan”, apasă „Generează plan” ca AI să propună structura, apoi adaugă, editează sau șterge capitolele după cum vrei.",
  },
  {
    title: "4. Generează conținut",
    body: "În fila „Conținut”, generează lecții și teste pe baza planului și a surselor. Poți reface și regândi părțile individual.",
  },
  {
    title: "5. Validează",
    body: "Verifică materialul generat în fila „Conținut”: aprobă sau respinge variantele până ești mulțumit de calitate.",
  },
  {
    title: "6. Publică",
    body: "Apasă „Publică” ca materialul să ajungă în conținutul live, vizibil pentru elevi. Poți publica totul ori doar elementele selectate.",
  },
];

function StudioHelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cum funcționează AI Content Studio"
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-feather bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <HelpCircle className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-ink">Cum funcționează AI Content Studio</h2>
              <p className="mt-0.5 text-sm text-subtle">
                Transformă o sursă în conținut de BAC, pas cu pas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide ajutorul"
            className="rounded-full p-2 text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="space-y-3">
          {HELP_STEPS.map((step) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">
                {step.title.split(".")[0]}
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{step.title.split(". ")[1]}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-subtle">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-2xl bg-ink/5 px-4 py-3 text-sm text-subtle">
          „Asistent AI” răspunde pe baza proiectului curent, cu istoricul activității de aici — folosește-l
          pentru întrebări despre conținut, nu ca înlocuitor al pașilor de mai sus.
        </p>
      </div>
    </div>,
    document.body
  );
}

function SourcesTab({
  project,
  showToast,
}: {
  project: AiContentProjectData;
  showToast: (m: string) => void;
}) {
  const [pending, setPending] = useState<"none" | "upload" | "analyze:" | "delete:">("none");
  const [pendingId, setPendingId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [priority, setPriority] = useState("NORMAL");
  const busy = (kind: string, id?: string) => pending === kind && (!id || pendingId === id);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // True dacă Vercel Blob e configurat → upload direct la Blob (fără limita de 4.5 MB).
  const [blobReady, setBlobReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/ai-content/storage")
      .then((r) => r.json().catch(() => ({})))
      .then((d) => {
        if (alive) setBlobReady(Boolean(d?.blob));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const upload = async () => {
    if (!file) {
      showToast("Alege un fișier (PDF, DOCX, TXT, MD).");
      return;
    }
    setPending("upload");
    try {
      if (blobReady) {
        // Upload direct la Vercel Blob: fișierul nu trece prin serverless function.
        const blob = await blobUpload(
          `content-studio/${project.id}/${file.name}`,
          file,
          {
            access: "public",
            handleUploadUrl: "/api/admin/ai-content/upload",
            clientPayload: JSON.stringify({ projectId: project.id, priority }),
          }
        );
        // După ce Blob a primit fișierul, înregistrăm sursa în DB (validare head() server-side).
        const reg = await fetch("/api/admin/ai-content/upload/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: blob.url,
            projectId: project.id,
            priority,
            originalName: file.name,
          }),
        });
        const regBody = (await reg.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!reg.ok || !regBody.ok) {
          throw new Error(regBody.error || "Înregistrarea sursei a eșuat.");
        }
      } else {
        // Fallback local (dezvoltare fără BLOB_READ_WRITE_TOKEN): upload server-side.
        const form = new FormData();
        form.append("projectId", project.id);
        form.append("priority", priority);
        form.append("file", file);
        const res = await fetch("/api/admin/ai-content/upload", { method: "POST", body: form });
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !body.ok) {
          throw new Error(body.error || "Upload eșuat.");
        }
      }
      showToast("Sursă încărcată.");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload eșuat.");
    } finally {
      setPending("none");
    }
  };

  const analyze = async (sourceId: string) => {
    setPending("analyze:");
    setPendingId(sourceId);
    const res = await fetch("/api/admin/ai-content/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setPending("none");
    setPendingId("");
    if (!res.ok || !body.ok) {
      showToast(body.error || "Procesare eșuată.");
      return;
    }
    showToast("Sursă procesată (chunks + embeddings).");
    router.refresh();
  };

  const changePriority = async (sourceId: string, next: string) => {
    const res = await setSourcePriority({ sourceId, priority: next });
    if (res.ok) showToast("Prioritate actualizată.");
  };

  const remove = async (sourceId: string) => {
    if (!window.confirm("Ștergi sursa (inclusiv fișierul și chunks-urile)?")) return;
    setPending("delete:");
    setPendingId(sourceId);
    const res = await deleteSource({ sourceId });
    setPending("none");
    setPendingId("");
    if (res.ok) showToast("Sursă ștearsă.");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-feather bg-card p-5">
        <p className="font-extrabold text-ink">Adaugă o sursă</p>
        <p className="mt-1 text-xs text-subtle">
          PDF, DOCX, TXT sau Markdown, maxim 25 MB. După upload, apasă „Procesează” pentru extragere + embeddings.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block flex-1 text-sm font-semibold text-subtle">
            Fișier
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none transition-colors focus:border-accent"
            />
          </label>
          <label className="block text-sm font-semibold text-subtle">
            Prioritate
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 block rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none transition-colors focus:border-accent"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
          </label>
          <ActionButton pending={busy("upload")} onClick={upload}>
            <Upload className="h-4 w-4" /> Încarcă
          </ActionButton>
        </div>
      </div>

      <div className="space-y-2">
        {project.sources.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-feather bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{s.originalName}</p>
              <p className="text-xs text-subtle">
                {s.mime} · {(s.size / 1024).toFixed(0)} KB · încărcat {fullDate(s.createdAt)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <select
                  value={s.priority}
                  onChange={(e) => changePriority(s.id, e.target.value)}
                  title="Prioritate sursă"
                  className="rounded-lg border border-feather bg-background px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-accent"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {priorityLabels[p]}
                    </option>
                  ))}
                </select>
                <span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-bold text-subtle">
                  {sourceStatusLabels[s.status] ?? s.status}
                </span>
                {s.pageCount ? (
                  <span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-semibold text-subtle">
                    {s.pageCount} pag. · {s.charCount} caract.
                  </span>
                ) : null}
              </div>
              {s.error ? <p className="mt-1 text-xs text-danger">{s.error}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <ActionButton
                small
                variant="accent"
                pending={busy("analyze:", s.id)}
                disabled={s.status === "PROCESSING"}
                onClick={() => analyze(s.id)}
                title="Extrage text, creează chunks și embeddings"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Procesează
              </ActionButton>
              <ActionButton small variant="danger" pending={busy("delete:", s.id)} onClick={() => remove(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </ActionButton>
            </div>
          </div>
        ))}
        {project.sources.length === 0 && (
          <p className="rounded-2xl border border-feather bg-card p-5 text-sm text-subtle">
            Încă nu a fost încărcată nicio sursă.
          </p>
        )}
      </div>
    </div>
  );
}

function PlanTab({
  project,
  showToast,
}: {
  project: AiContentProjectData;
  showToast: (m: string) => void;
}) {
  const [genPending, setGenPending] = useState(false);
  const [addKind, setAddKind] = useState("UNIT");
  const [addParentId, setAddParentId] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  const chapters = project.nodes.filter((n) => n.kind === "CHAPTER" && !n.parentId);
  const unitsOf = (chId: string) =>
    project.nodes.filter((n) => n.kind === "UNIT" && n.parentId === chId);
  const conceptsOf = (uId: string) => project.nodes.filter((n) => n.kind === "CONCEPT" && n.parentId === uId);

  const generate = async () => {
    setGenPending(true);
    const ok = await runAction(showToast, () => generateCurriculum({ projectId: project.id }));
    if (ok) showToast("Plan de curriculum generat.");
    setGenPending(false);
  };

  const addNode = async () => {
    if (!addTitle.trim()) return;
    try {
      await addCurriculumNode({
        projectId: project.id,
        kind: addKind as "CHAPTER" | "UNIT" | "CONCEPT",
        parentId: addKind === "CHAPTER" ? null : addParentId,
        title: addTitle.trim(),
      });
      showToast("Nod adăugat.");
      setAddTitle("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Eroare.");
    }
  };

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const node = project.nodes.find((n) => n.id === editingId);
    try {
      await saveCurriculumNode({
        nodeId: editingId,
        title: editTitle.trim(),
        description: node?.description ?? null,
      });
      showToast("Nod salvat.");
      setEditingId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Eroare.");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Ștergi nodul (și sub-nodurile)?")) return;
    setDelId(id);
    const res = await deleteCurriculumNode({ nodeId: id });
    setDelId(null);
    if (res.ok) showToast("Nod șters.");
  };

  const nodeRow = (n: AiContentProjectData["nodes"][number], depth: number) => {
    const isEditing = editingId === n.id;
    return (
      <div key={n.id} className="flex items-start justify-between gap-3" style={{ marginLeft: depth * 22 }}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-subtle">
              {kindLabels[n.kind]}
            </span>
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                className="rounded-xl border border-feather bg-background px-2 py-1 text-sm font-bold text-ink outline-none focus:border-accent"
              />
            ) : (
              <span className="font-bold text-ink">{n.title}</span>
            )}
            {n.mappedId && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                publicat
              </span>
            )}
          </div>
          {n.description ? (
            <p className="mt-0.5 text-xs text-subtle">{n.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isEditing ? (
            <>
              <ActionButton small pending={false} onClick={saveEdit} title="Salvează">
                <Save className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton small variant="ghost" pending={false} onClick={() => setEditingId(null)}>
                <X className="h-3.5 w-3.5" />
              </ActionButton>
            </>
          ) : (
            <>
              <ActionButton small variant="ghost" pending={false} onClick={() => startEdit(n.id, n.title)}>
                ✎
              </ActionButton>
              <ActionButton small variant="danger" pending={delId === n.id} onClick={() => remove(n.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </ActionButton>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-feather bg-card p-5">
        <div>
          <p className="font-extrabold text-ink">Plan de curriculum</p>
          <p className="mt-1 text-xs text-subtle">
            Capitole → Unități → Concepte. Generează cu AI din surse, apoi editează manual.
          </p>
        </div>
        <ActionButton pending={genPending} onClick={generate}>
          <Sparkles className="h-4 w-4" /> Generează planul
        </ActionButton>
      </div>

      <div className="rounded-2xl border border-feather bg-card p-4">
        <p className="text-sm font-extrabold text-ink">Adaugă nod manual</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <select
            value={addKind}
            onChange={(e) => setAddKind(e.target.value)}
            className="rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
          >
            <option value="CHAPTER">Capitol</option>
            <option value="UNIT">Unitate</option>
            <option value="CONCEPT">Concept</option>
          </select>
          {addKind !== "CHAPTER" && (
            <select
              value={addParentId}
              onChange={(e) => setAddParentId(e.target.value)}
              className="rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
            >
              <option value="">Alege părintele...</option>
              {chapters.map((c) => (
                <optgroup key={c.id} label={c.title}>
                  <option value={c.id}>{c.title}</option>
                  {unitsOf(c.id).map((u) => (
                    <option key={u.id} value={u.id}>
                      {"  "}→ {u.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          <input
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            placeholder="Titlu nod"
            className="min-w-40 flex-1 rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
          />
          <ActionButton pending={false} onClick={addNode}>
            Adaugă
          </ActionButton>
        </div>
      </div>

      <div className="space-y-3">
        {chapters.length === 0 && (
          <p className="rounded-2xl border border-feather bg-card p-5 text-sm text-subtle">
            Nu există un plan. Generează-l sau adaugă un capitol manual.
          </p>
        )}
        {chapters.map((ch) => (
          <div key={ch.id} className="space-y-2 rounded-2xl border border-feather bg-card p-4">
            {nodeRow(ch, 0)}
            {unitsOf(ch.id).map((u) => (
              <div key={u.id} className="space-y-1 border-l border-feather pl-4">
                {nodeRow(u, 0)}
                {conceptsOf(u.id).map((c) => nodeRow(c, 1))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  project,
  showToast,
}: {
  item: AiContentProjectData["items"][number];
  project: AiContentProjectData;
  showToast: (m: string) => void;
}) {
  const [pendingAction, setPendingAction] = useState("");
  const [view, setView] = useState<"preview" | "json" | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [regenerating, setRegenerating] = useState<"step" | "question" | null>(null);
  const [partIndex, setPartIndex] = useState("0");
  const [partInstruction, setPartInstruction] = useState("");

  const node = project.nodes.find((n) => n.id === item.nodeId);
  const validation = (item.validation ?? null) as {
    overallScore?: number;
    criteria?: Array<{ name?: string; score?: number }>;
    issues?: Array<{ severity: string; message: string }>;
    suggestions?: string[];
  } | null;

  const pending = (name: string) => pendingAction === name;

  const run = async (name: string, fn: () => Promise<{ ok?: boolean; error?: string }>) => {
    setPendingAction(name);
    const ok = await runAction(showToast, fn);
    setPendingAction("");
    return ok;
  };

  const doValidate = () =>
    run("validate", () => validateItem({ itemId: item.id }));

  const doApprove = () =>
    run("approve", () => approveItem({ itemId: item.id }));

  const doReject = () =>
    run("reject", () => rejectItem({ itemId: item.id }));

  const doPublish = async () => {
    setPendingAction("publish");
    let res;
    try {
      res = await publishItem({ itemId: item.id });
    } catch (err) {
      setPendingAction("");
      showToast(err instanceof Error ? err.message : "Publicare eșuată.");
      return;
    }
    if (res.ok === false) {
      setPendingAction("");
      showToast(res.error || "Publicare eșuată.");
      return;
    }
    const typed = res as { duplicates?: Array<{ title: string; location: string }> };
    if (typed.duplicates?.length) {
      const list = typed.duplicates.map((d) => `- ${d.title} (${d.location})`).join("\n");
      if (!window.confirm(`Există posibile duplicate în conținutul live:\n${list}\n\nPublică oricum?`)) {
        setPendingAction("");
        showToast("Publicare anulată.");
        return;
      }
      try {
        res = await publishItem({ itemId: item.id, ignoreDuplicates: true });
      } catch (err) {
        setPendingAction("");
        showToast(err instanceof Error ? err.message : "Publicare eșuată.");
        return;
      }
      if (res.ok === false) {
        setPendingAction("");
        showToast(res.error || "Publicare eșuată.");
        return;
      }
    }
    setPendingAction("");
    showToast("Item publicat în sistemul live.");
  };

  const openEditor = () => {
    setJsonText(prettyJson(item.draft));
    setView((v) => (v === "json" ? null : "json"));
  };

  const saveDraft = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      showToast("JSON invalid.");
      return;
    }
    const ok = await run("save", () =>
      updateItemDraft({ itemId: item.id, draft: parsed, note: "editare din panou" })
    );
    if (ok) setView(null);
  };

  const regenerate = async () => {
    if (!regenerating || !partInstruction.trim()) {
      showToast("Alege ce regenerezi și scrie instrucțiunea.");
      return;
    }
    const idx = Number(partIndex);
    const ok = await run("regen", () =>
      regenerateItemPart({
        itemId: item.id,
        part: regenerating,
        index: idx,
        instruction: partInstruction.trim(),
      })
    );
    if (ok) {
      showToast("Parte regenerată.");
      setPartInstruction("");
    }
  };

  const issues = (validation?.issues ?? []).slice(0, 3);
  const criteria = validation?.criteria ?? [];

  return (
    <div className="rounded-2xl border border-feather bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-subtle">
              {typeLabels[item.type]}
            </span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
              {statusLabels[item.status] ?? item.status}
            </span>
            {node ? (
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-subtle">
                {node.title}
              </span>
            ) : null}
            {validation?.overallScore != null && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  validation.overallScore >= 80
                    ? "bg-emerald-500/10 text-emerald-600"
                    : validation.overallScore >= 60
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-danger/10 text-danger"
                )}
              >
                scor validare {validation.overallScore}/100
              </span>
            )}
          </div>
          <p className="mt-1 font-bold text-ink">{item.title}</p>
          <p className="text-xs text-subtle">v{item.version} · {fullDate(item.updatedAt)}</p>
          {item.note && <p className="mt-1 text-xs text-danger">Notă: {item.note}</p>}
        </div>
      </div>

      {issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {issues.map((iss, i) => (
            <li key={i} className="text-xs text-subtle">
              <span className="font-bold text-ink">{iss.severity}:</span> {iss.message}
            </li>
          ))}
        </ul>
      )}

      {criteria.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-feather pt-2">
          {criteria.map((c, i) => {
            const score = typeof c.score === "number" ? Math.max(0, Math.min(100, c.score)) : 0;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-44 shrink-0 truncate text-xs font-semibold text-subtle" title={c.name}>
                  {c.name}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/5">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-danger"
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-bold text-ink">{score}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton small variant="outline" pending={false} onClick={() => setView((v) => (v === "preview" ? null : "preview"))}>
          <Eye className="h-3.5 w-3.5" /> Vizualizează
        </ActionButton>
        <ActionButton small variant="outline" pending={false} onClick={openEditor}>
          <FileText className="h-3.5 w-3.5" /> JSON
        </ActionButton>
        <ActionButton small variant="accent" pending={pending("validate")} onClick={doValidate} title="Frunzele AI">
          <Sparkles className="h-3.5 w-3.5" /> Validează
        </ActionButton>
        {item.status !== "APPROVED" && item.status !== "PUBLISHED" && (
          <ActionButton small pending={pending("approve")} onClick={doApprove} title="Aprobă draft-ul">
            <Check className="h-3.5 w-3.5" /> Aprobă
          </ActionButton>
        )}
        <ActionButton small variant="ghost" pending={pending("reject")} onClick={doReject} title="Respinge cu notă">
          Respinge
        </ActionButton>
        {item.status === "APPROVED" && (
          <ActionButton small pending={pending("publish")} onClick={doPublish} title="Publică în sistemul live">
            <Upload className="h-3.5 w-3.5" /> Publică
          </ActionButton>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-feather pt-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRegenerating((v) => (v === "step" ? null : "step"))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              regenerating === "step" ? "bg-accent text-white" : "border border-feather text-subtle hover:text-ink"
            )}
          >
            Pas lecție
          </button>
          <button
            type="button"
            onClick={() => setRegenerating((v) => (v === "question" ? null : "question"))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              regenerating === "question" ? "bg-accent text-white" : "border border-feather text-subtle hover:text-ink"
            )}
          >
            Întrebare
          </button>
        </div>
        {regenerating && (
          <>
            <input
              type="number"
              min={0}
              value={partIndex}
              onChange={(e) => setPartIndex(e.target.value)}
              title="Index (de la 0)"
              className="w-20 rounded-xl border border-feather bg-background px-2 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
            />
            <input
              value={partInstruction}
              onChange={(e) => setPartInstruction(e.target.value)}
              placeholder="ex. Simplifică și dă un exemplu din surse"
              className="min-w-40 flex-1 rounded-xl border border-feather bg-background px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
            />
            <ActionButton small pending={pending("regen")} onClick={regenerate}>
              <RefreshCw className="h-3.5 w-3.5" /> Regen.
            </ActionButton>
          </>
        )}
      </div>

      {view === "preview" && (
        <div className="mt-3 border-t border-feather pt-3">
          <DraftPreview type={item.type} draft={item.draft} />
        </div>
      )}

      {view === "json" && (
        <div className="mt-3">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full rounded-xl border border-feather bg-background p-3 font-mono text-xs text-ink outline-none focus:border-accent"
          />
          <div className="mt-2 flex gap-2">
            <ActionButton small pending={pending("save")} onClick={saveDraft}>
              <Save className="h-3.5 w-3.5" /> Salvează draft
            </ActionButton>
            <ActionButton small variant="ghost" pending={false} onClick={() => setView(null)}>
              Închide
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentTab({
  project,
  showToast,
}: {
  project: AiContentProjectData;
  showToast: (m: string) => void;
}) {
  const [genState, setGenState] = useState<{ nodeId: string; type: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const unitNodes = project.nodes.filter((n) => n.kind === "UNIT" || n.kind === "CONCEPT");

  const generate = async (nodeId: string, type: string) => {
    setGenerating(true);
    setGenState({ nodeId, type });
    try {
      const ok = await runAction(showToast, () =>
        generateItem({ projectId: project.id, nodeId, type: type as "LESSON" | "QUIZ" | "CHECKPOINT" })
      );
      if (ok) showToast("Item generat. Revizuiește draft-ul.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-feather bg-card p-5">
        <p className="font-extrabold text-ink">Generează conținut</p>
        <p className="mt-1 text-xs text-subtle">
          Alege o unitate sau un concept din plan și un tip. Generarea folosește sursele proiectului (embeddings).
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select
            value={genState?.nodeId ?? ""}
            onChange={(e) => setGenState((s) => ({ nodeId: e.target.value, type: s?.type ?? "LESSON" }))}
            disabled={generating}
            className="min-w-48 rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Alege unitatea...</option>
            {unitNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {kindLabels[n.kind]}: {n.title}
              </option>
            ))}
          </select>
          <select
            value={genState?.type ?? "LESSON"}
            onChange={(e) =>
              setGenState((s) => ({ nodeId: s?.nodeId ?? "", type: e.target.value }))
            }
            disabled={generating}
            className="rounded-xl border border-feather bg-background px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="LESSON">Lecție</option>
            <option value="QUIZ">Quiz</option>
            <option value="CHECKPOINT">Checkpoint</option>
          </select>
          <ActionButton
            pending={generating}
            disabled={!genState?.nodeId || generating}
            onClick={() => {
              if (genState?.nodeId) generate(genState.nodeId, genState.type);
            }}
          >
            <Sparkles className="h-4 w-4" /> {generating ? "Generează…" : "Generează"}
          </ActionButton>
        </div>
      </div>

      {generating && (
        <p className="text-sm text-subtle">Se generează… (poate dura 1-2 minute)</p>
      )}

      <div className="space-y-3">
        {project.items.length === 0 && (
          <p className="rounded-2xl border border-feather bg-card p-5 text-sm text-subtle">
            Niciun item generat. Alege o unitate și generează.
          </p>
        )}
        {project.items.map((item) => (
          <ItemCard key={item.id} item={item} project={project} showToast={showToast} />
        ))}
      </div>
    </div>
  );
}

function ActivityTab({ project }: { project: AiContentProjectData }) {
  const activityLabels: Record<string, string> = {
    "proiect:creat": "Proiect creat",
    "proiect:editat": "Proiect editat",
    "curriculum:generare-inceput": "Generare plan începută",
    "curriculum:generat": "Plan generat",
    "curriculum:eroare": "Eroare la plan",
    "curriculum:nod-adaugat": "Nod adăugat",
    "item:lectie-generata": "Lecție generată",
    "item:quiz-generat": "Quiz generat",
    "item:checkpoint-generat": "Checkpoint generat",
    "item:eroare": "Eroare la generare",
    "item:validat": "Item validat",
    "item:aprobat": "Item aprobat",
    "item:respins": "Item respins",
    "item:publicat": "Item publicat",
    "item:publish-eroare": "Eroare la publicare",
    "item:step-regenerat": "Pas regenerat",
    "item:question-regenerat": "Întrebare regenerată",
  };

  return (
    <div className="space-y-3">
      {project.activities.length === 0 && (
        <p className="rounded-2xl border border-feather bg-card p-5 text-sm text-subtle">
          Fără activitate încă.
        </p>
      )}
      {project.activities.map((a) => (
        <div key={a.id} className="rounded-2xl border border-feather bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">
              {activityLabels[a.action] ?? a.action}
            </p>
            <span className="text-xs text-subtle">{fullDate(a.createdAt)}</span>
          </div>
          {a.detail && typeof a.detail === "object" ? (
            <pre className="mt-2 overflow-x-auto rounded-xl bg-ink/5 p-2 text-[11px] text-subtle">
              {JSON.stringify(a.detail, null, 2)}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}