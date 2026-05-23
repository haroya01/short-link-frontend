"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  commitProfileImageUpload,
  presignProfileImageUpload,
  uploadAvatarToS3,
} from "@/lib/api";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;
const MAX_DIM = 1600;

type Props = {
  /** Current public URL; null when no image is attached. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Disable removing — e.g. when the parent enforces "must have one image". */
  removable?: boolean;
  /** Custom hint inside the empty state. Falls back to a translated default. */
  emptyHint?: string;
  /** Aspect-ratio class for the preview tile (e.g. {@code aspect-square} / {@code aspect-[4/3]}). */
  aspectClass?: string;
  /**
   * Target aspect ratio (width / height) for the cropper. Default matches {@link aspectClass}
   * (4/3 → 4/3). Pass an explicit number when {@link aspectClass} is a Tailwind arbitrary value the
   * cropper can't introspect (e.g. {@code aspect-[5/3]} → 5/3).
   */
  cropAspect?: number;
};

/**
 * File-input image uploader for profile-block images (gallery / product card / image / place
 * cover). Pick a file → {@link ImageCropperDialog} (drag + pinch + zoom at the target aspect) →
 * presigned S3 PUT → commit → onChange with the public URL. The cropper replaced the old
 * "resize-to-fit, no preview" flow so users frame their photos before upload; backend HEAD-checks
 * the size on commit so the client-side resize is purely a UX optimization.
 *
 * <p>Renders as a square (or custom-aspect) tile: empty state shows an upload prompt; filled
 * shows the image with a hover-revealed re-pick button + an explicit remove button below.
 */
export function ImageUploader({
  value,
  onChange,
  removable = true,
  emptyHint,
  aspectClass = "aspect-square",
  cropAspect,
}: Props) {
  const t = useTranslations("settings.profile.imageUploader");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const effectiveAspect = cropAspect ?? aspectClassToRatio(aspectClass);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast(t("invalidType"), "error");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast(t("tooBig"), "error");
      return;
    }
    setPickedFile(file);
  }

  async function handleCropped(cropped: File) {
    setPickedFile(null);
    setBusy(true);
    try {
      const presign = await presignProfileImageUpload(OUTPUT_TYPE);
      if (cropped.size > presign.maxBytes) {
        toast(t("tooBig"), "error");
        return;
      }
      // S3 PUT shape is identical for any presigned upload — reuse the avatar helper.
      await uploadAvatarToS3(presign.uploadUrl, cropped, OUTPUT_TYPE);
      const committed = await commitProfileImageUpload(presign.key);
      onChange(committed.imageUrl);
    } catch (err) {
      toast(errorMessage(err, t("uploadFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  const cropper = (
    <ImageCropperDialog
      open={pickedFile !== null}
      file={pickedFile}
      aspect={effectiveAspect}
      cropShape="rect"
      outputMaxDim={MAX_DIM}
      outputType={OUTPUT_TYPE}
      outputQuality={OUTPUT_QUALITY}
      onCancel={() => setPickedFile(null)}
      onConfirm={handleCropped}
    />
  );

  if (value) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className={`group relative block w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 ${aspectClass}`}
          aria-label={t("replace")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-[11px] font-medium">{t("replace")}</span>
            )}
          </span>
        </button>
        {removable && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-red-600"
          >
            <X className="h-2.5 w-2.5" />
            {t("remove")}
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          onChange={handlePick}
          className="hidden"
        />
        {cropper}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50/50 text-slate-500 transition hover:border-slate-400 hover:text-slate-700 disabled:opacity-50 ${aspectClass}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        <span className="text-[11px]">{emptyHint ?? t("emptyHint")}</span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        onChange={handlePick}
        className="hidden"
      />
      {cropper}
    </>
  );
}

/**
 * Heuristic: parse the common {@code aspect-square} / {@code aspect-[W/H]} / {@code aspect-video}
 * Tailwind classes into a numeric aspect ratio for the cropper. Falls back to 4/3 when the class
 * isn't recognized so the cropper still functions — caller can override via the explicit
 * {@code cropAspect} prop when in doubt.
 */
function aspectClassToRatio(className: string): number {
  if (className.includes("aspect-square")) return 1;
  if (className.includes("aspect-video")) return 16 / 9;
  const match = className.match(/aspect-\[(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\]/);
  if (match) {
    const w = parseFloat(match[1]);
    const h = parseFloat(match[2]);
    if (h > 0) return w / h;
  }
  return 4 / 3;
}
