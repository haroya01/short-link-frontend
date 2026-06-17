"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { ZoomIn, ZoomOut } from "lucide-react";

type CropShape = "rect" | "round";
type OutputType = "image/jpeg" | "image/webp" | "image/png";

type Props = {
  open: boolean;
  /** Source file picked by the user. Null when dialog is closed. */
  file: File | null;
  /** Target aspect ratio (width / height). Avatar 1, banner 3, place cover 5/3, etc. */
  aspect: number;
  /** Visual mask shape for the crop region. {@code round} for avatar / square logos. */
  cropShape?: CropShape;
  /** Longer-edge cap on the output. Resize-down only — never upscales. */
  outputMaxDim?: number;
  outputType?: OutputType;
  outputQuality?: number;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
};

/**
 * Image cropper dialog used by every upload entry point (avatar / banner / contact logo / gallery
 * / product card / place cover / image block). Builds on {@code react-easy-crop} for the core
 * pinch+wheel+drag interaction; the surrounding shell is custom so the visual matches our card
 * design language (dark canvas / amber primary / rounded-2xl).
 *
 * <p>UX spec source: PR-cropper-research (2026-05-12). Mobile = full-screen sheet; desktop = 520x620
 * centered dialog with a dark blurred backdrop. Grid lines (rule-of-thirds) only show during
 * active interaction then fade out — always-on grid reads as noise. The output File is what the
 * caller hands to {@code resizeImage} / presigned upload as if the user had picked a perfect
 * file from disk.
 */
export function ImageCropperDialog({
  open,
  file,
  aspect,
  cropShape = "rect",
  outputMaxDim = 1600,
  outputType = "image/jpeg",
  outputQuality = 0.9,
  onCancel,
  onConfirm,
}: Props) {
  const t = useTranslations("imageCropper");
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [interacting, setInteracting] = useState(false);
  const [busy, setBusy] = useState(false);

  // Source URL lifecycle: create on open, revoke on close. We use objectURL not data-URL because
  // large source images (a 4032×3024 phone shot) blow up data-URL strings to ~7MB which slows the
  // initial paint by 200-300ms while the browser parses base64.
  useEffect(() => {
    if (!open || !file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  // Grid auto-fade — show on any crop / zoom change, then hide after 400ms of stillness. Mirrors
  // Apple Photos / Instagram pattern: rule-of-thirds appears as a positioning aid while the user
  // is actively framing, then gets out of the way once they settle.
  const gridTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function ping() {
    setInteracting(true);
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current);
    gridTimerRef.current = setTimeout(() => setInteracting(false), 400);
  }
  useEffect(() => {
    return () => {
      if (gridTimerRef.current) clearTimeout(gridTimerRef.current);
    };
  }, []);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setAreaPixels(areaPx);
  }, []);

  async function handleConfirm() {
    if (!src || !areaPixels) return;
    setBusy(true);
    try {
      const cropped = await getCroppedImage(src, areaPixels, {
        maxDim: outputMaxDim,
        type: outputType,
        quality: outputQuality,
      });
      onConfirm(cropped);
    } catch {
      /* swallow — toast is the caller's responsibility */
    } finally {
      setBusy(false);
    }
  }

  // Esc to cancel. Doesn't conflict with focus inside the slider since range inputs don't capture
  // Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center"
    >
      <div className="flex h-full w-full flex-col bg-zinc-950 text-white shadow-2xl sm:h-[620px] sm:max-h-[90vh] sm:w-[520px] sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring rounded-md px-1 text-sm text-zinc-400 transition hover:text-white"
          >
            {t("cancel")}
          </button>
          <h2 className="text-sm font-semibold tracking-tight text-white/90">{t("title")}</h2>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !areaPixels}
            className="focus-ring rounded-full bg-amber-400 px-4 py-1 text-sm font-semibold text-zinc-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t("applying") : t("apply")}
          </button>
        </header>

        <div className="relative flex-1 bg-zinc-950">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={interacting}
            minZoom={1}
            maxZoom={3}
            zoomSpeed={0.5}
            objectFit="contain"
            onCropChange={(c) => {
              setCrop(c);
              ping();
            }}
            onZoomChange={(z) => {
              setZoom(z);
              ping();
            }}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "#0a0a0a" },
              cropAreaStyle: {
                border: "1px solid rgba(255,255,255,0.4)",
                color: "rgba(0,0,0,0.62)",
              },
            }}
          />
        </div>

        <footer className="border-t border-white/10 px-6 pb-5 pt-3">
          <p className="mb-2 text-center text-[11px] text-white/50">{t("hint")}</p>
          <div className="flex items-center gap-3">
            <ZoomOut className="h-3.5 w-3.5 text-white/40" aria-hidden />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => {
                setZoom(parseFloat(e.target.value));
                ping();
              }}
              aria-label={t("zoom")}
              className="focus-ring flex-1 accent-amber-400"
            />
            <ZoomIn className="h-4 w-4 text-white/70" aria-hidden />
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Crops a source image to the area picked by the user and re-encodes it. Caps the longer edge to
 * {@code maxDim} so a phone-shot source (4032×3024) doesn't ship a 10MB cropped file when the
 * user only needed a 512×512 avatar. Re-encode is unconditional so the output type is predictable
 * regardless of input.
 */
async function getCroppedImage(
  src: string,
  area: Area,
  opts: { maxDim: number; type: OutputType; quality: number },
): Promise<File> {
  const img = await loadImage(src);
  const longer = Math.max(area.width, area.height);
  const scale = longer > opts.maxDim ? opts.maxDim / longer : 1;
  const dw = Math.max(1, Math.round(area.width * scale));
  const dh = Math.max(1, Math.round(area.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, dw, dh);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      opts.type,
      opts.quality,
    ),
  );
  const ext = opts.type === "image/jpeg" ? "jpg" : opts.type === "image/webp" ? "webp" : "png";
  return new File([blob], `cropped.${ext}`, { type: opts.type });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}
