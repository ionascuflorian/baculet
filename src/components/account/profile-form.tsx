"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import { updateProfile } from "@/lib/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarEditor } from "@/components/account/avatar-editor";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export function ProfileForm({
  initial,
}: {
  initial: { name: string; image: string };
}) {
  const [preview, setPreview] = useState<string | null>(
    initial.image.startsWith("data:image") ? initial.image : null
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, action, pending] = useActionState(updateProfile, {});

  const onFile = (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Alege un fișier imagine (JPG, PNG, WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        "Imaginea e prea mare (max 8 MB). Încearcă una mai mică."
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditing(String(reader.result ?? ""));
    };
    reader.onerror = () => {
      setFileError("Nu am putut citi fișierul. Mai încearcă.");
    };
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => fileRef.current?.click();

  const handleAvatarClick = () => {
    if (preview) {
      setEditing(preview);
    } else {
      openFilePicker();
    }
  };

  const handleEditorSave = (dataUrl: string) => {
    setPreview(dataUrl);
    setEditing(null);
    setFileError(null);
  };

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-feather/60"
          aria-label={
            preview ? "Modifică poza de profil" : "Schimbă poza de profil"
          }
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Previzualizare"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl font-extrabold text-subtle">
              {initial.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-6 w-6" />
          </span>
        </button>
        <div className="flex flex-col gap-1.5">
          <p className="font-bold text-ink">Poza de profil</p>
          <p className="text-xs text-subtle">
            {preview
              ? "Click pe poză pentru a-i modifica cropul."
              : "Click pe poză pentru a încărca și edita o fotografie."}
          </p>
          {preview && (
            <button
              type="button"
              onClick={openFilePicker}
              className="w-fit text-xs font-semibold text-accent transition-colors hover:underline"
            >
              Schimbă poza
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {fileError && (
        <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {fileError}
        </p>
      )}

      <input type="hidden" name="image" value={preview ?? ""} />

      <div>
        <Label htmlFor="name">Nume complet</Label>
        <Input id="name" name="name" defaultValue={initial.name} required />
      </div>

      {state.error && (
        <p className="animate-pop-in rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="animate-pop-in flex items-center gap-1.5 rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">
          <Check className="h-4 w-4" /> Profil actualizat!
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Check className="h-5 w-5" />
        )}
        {pending ? "Se salvează…" : "Salvează modificările"}
      </Button>

      {editing && (
        <AvatarEditor
          imageSrc={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditorSave}
          onPickImage={openFilePicker}
        />
      )}
    </form>
  );
}