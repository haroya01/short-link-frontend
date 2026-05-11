"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  commitProfileImageUpload,
  presignProfileImageUpload,
  uploadAvatarToS3,
} from "@/lib/api";
import { resizeImage } from "@/lib/image-resize";
import { useToast } from "../ui/toast";
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
};

/**
 * File-input image uploader for profile-block images (gallery / product card). Picks a file →
 * client-side resize (max 1600px longer edge, JPEG @0.9) → backend presigned PUT → S3 upload →
 * commit → onChange with the public URL. Backend HEAD-checks the size on commit, so the
 * client-side resize is purely a UX optimization.
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
}: Props) {
  const t = useTranslations("settings.profile.imageUploader");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
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
    setBusy(true);
    try {
      const resized = await resizeImage(file, {
        maxDim: MAX_DIM,
        square: false,
        type: OUTPUT_TYPE,
        quality: OUTPUT_QUALITY,
        filename: "profile-image.jpg",
      });
      const presign = await presignProfileImageUpload(OUTPUT_TYPE);
      if (resized.size > presign.maxBytes) {
        toast(t("tooBig"), "error");
        return;
      }
      // S3 PUT shape is identical for any presigned upload — reuse the avatar helper.
      await uploadAvatarToS3(presign.uploadUrl, resized, OUTPUT_TYPE);
      const committed = await commitProfileImageUpload(presign.key);
      onChange(committed.imageUrl);
    } catch (err) {
      toast(errorMessage(err, t("uploadFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

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
    </>
  );
}
