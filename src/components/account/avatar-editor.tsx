"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Cropper from "react-easy-crop";
import { Loader2, RotateCcw, Upload, ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const OUTPUT_SIZE = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Pozele externe (ex. avatar Google) au nevoie de CORS pentru a putea fi
    // desenate pe canvas și exportate (googleusercontent trimite ACAO: *).
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Nu am putut citi imaginea."));
    img.src = src;
  });
}

async function cropAndCompress(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  rotation: number
): Promise<string> {
  const image = await loadImage(imageSrc);
  const rad = (rotation * Math.PI) / 180;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browserul nu acceptă editarea de imagini.");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Browserul nu acceptă editarea de imagini.");

  outCtx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return out.toDataURL("image/jpeg", 0.85);
}

type Area = { x: number; y: number; width: number; height: number };

export function AvatarEditor({
  imageSrc,
  onClose,
  onSave,
  onPickImage,
}: {
  imageSrc: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  onPickImage?: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const rafRef = useRef<number>(0);
  const closeTimerRef = useRef<number>(0);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setCroppedArea(areaPixels));
  }, []);

  const closingRef = useRef(false);
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("crop-editor-open");
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("crop-editor-open");
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const shown = !closing;

  const handleSave = async () => {
    if (!croppedArea) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await cropAndCompress(imageSrc, croppedArea, rotation);
      onSave(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu am putut procesa imaginea."
      );
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${
        closing ? "pointer-events-none" : ""
      }`}
      style={{ zIndex: 2147483000 }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: closing ? 0.16 : 0.25, ease: "easeOut" }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={requestClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={
          closing
            ? { opacity: 0, scale: 0.95, y: 10 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={
          closing
            ? { duration: 0.16, ease: "easeIn" }
            : { type: "spring", stiffness: 380, damping: 28 }
        }
        className="surface pointer-events-auto relative w-full max-w-md rounded-3xl p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-ink">
            Editează poza
          </h2>
          <div className="flex items-center gap-2">
            {onPickImage && (
              <button
                type="button"
                onClick={onPickImage}
                className="flex items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/10"
              >
                <Upload className="h-3.5 w-3.5" /> Schimbă poza
              </button>
            )}
            <button
              type="button"
              onClick={requestClose}
              aria-label="Închide editorul"
              className="flex h-8 w-8 items-center justify-center rounded-full text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-black/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="rect"
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs font-semibold text-subtle">
              Zoom
              <ZoomIn className="h-4 w-4" />
            </span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[#0a7cff]"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs font-semibold text-subtle">
              Rotire
              <RotateCcw className="h-4 w-4" />
            </span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full accent-[#0a7cff]"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.2))}
              aria-label="Mărește zoom-ul"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink transition-colors hover:bg-ink/10"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.2))}
              aria-label="Micșorează zoom-ul"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink transition-colors hover:bg-ink/10"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setRotation(0)}
              className="ml-auto rounded-full px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:bg-ink/5 hover:text-ink"
            >
              Resetare
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={requestClose}>
            Anulează
          </Button>
          <Button type="button" onClick={handleSave} disabled={busy}>
            {busy && <Loader2 className="h-5 w-5 animate-spin" />}
            {busy ? "Se procesează…" : "Salvează poza"}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}