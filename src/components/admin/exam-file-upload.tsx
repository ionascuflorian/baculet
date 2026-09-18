"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UploadedFile {
  key: string;
  name: string;
  size: number;
  mime: string;
}

const MAX_BYTES = 25 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// Upload direct al unui PDF în R2 (bucket public) prin presigned PUT:
// browserul primește de la server un URL semnat de 15 min și urcă fișierul
// direct în R2, fără să treacă prin serverless. Serverul nu vede biții.
export function ExamFileUpload({
  kind,
  label,
  hint,
  value,
  onValue,
  onError,
  required,
}: {
  kind: "pdf" | "solution";
  label: string;
  hint?: string;
  value: UploadedFile | null;
  onValue: (v: UploadedFile | null) => void;
  onError: (message: string) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File | null) => {
    if (!file || uploading) return;
    if (file.type !== "application/pdf") {
      onError("Doar fișiere PDF sunt acceptate.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      onError("Fișierul depășește 25 MB.");
      return;
    }
    setUploading(true);
    try {
      const sign = await fetch("/api/admin/subiecte/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, fileName: file.name, contentType: file.type, size: file.size }),
      });
      const signed = (await sign.json().catch(() => ({}))) as { uploadUrl?: string; key?: string; error?: string };
      if (!sign.ok || !signed.uploadUrl || !signed.key) {
        throw new Error(signed.error || "Nu am putut începe upload-ul.");
      }
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        const text = await put.text().catch(() => "");
        throw new Error(text ? `Upload eșuat (${put.status}): ${text.slice(0, 120)}` : `Upload eșuat (${put.status}).`);
      }
      onValue({ key: signed.key, name: file.name, size: file.size, mime: file.type });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload eșuat.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (value) {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-feather bg-card px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{value.name}</p>
          <p className="text-xs text-subtle">
            Stocat în cloud (Cloudflare R2) · {formatSize(value.size)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onValue(null)}>
          <Trash2 className="h-4 w-4" /> Elimină
        </Button>
      </div>
    );
  }

  return (
    <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-feather bg-card px-3 py-5 text-center transition-colors hover:border-accent/40">
      {uploading ? (
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      ) : (
        <UploadCloud className="h-6 w-6 text-accent" />
      )}
      <span className="text-sm font-semibold text-ink">
        {uploading ? "Se urcă în cloud…" : label}
      </span>
      {hint && <span className="text-xs text-subtle">{hint}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={uploading}
        onChange={(e) => void pick(e.target.files?.[0] ?? null)}
      />
      {required && <span className="sr-only">Câmp obligatoriu</span>}
    </label>
  );
}