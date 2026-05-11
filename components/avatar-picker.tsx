"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  commitAvatarUpload,
  deleteAvatar,
  presignAvatarUpload,
  uploadAvatarToS3,
} from "@/lib/api";
import { resizeImage } from "@/lib/image-resize";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;

type Props = {
  currentUrl: string | null;
  /** Used as a fallback initial when no avatar is set yet. */
  initialChar: string;
  onChange: (avatarUrl: string | null) => void;
  /**
   * Longer-edge ceiling for the canvas resize step. Default 512 — the avatar use case never
   * renders larger than 80px @ 3x DPR. Other surfaces (e.g. profile background) call with their
   * own ceiling.
   */
  maxDim?: number;
  /** Center-crop to a square of {@code maxDim × maxDim}. Default true (avatar). */
  square?: boolean;
};

export function AvatarPicker({
  currentUrl,
  initialChar,
  onChange,
  maxDim = 512,
  square = true,
}: Props) {
  const t = useTranslations("avatar");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast(t("invalidType"), "error");
      return;
    }
    // Loose pre-check on the original — even a 10MP camera shot is fine here because the
    // canvas resize step shrinks everything to ~50–100KB before upload.
    if (file.size > MAX_INPUT_BYTES) {
      toast(t("tooBig"), "error");
      return;
    }
    setBusy(true);
    try {
      const resized = await resizeImage(file, {
        maxDim,
        square,
        type: OUTPUT_TYPE,
        quality: OUTPUT_QUALITY,
        filename: "avatar.jpg",
      });
      const presign = await presignAvatarUpload(OUTPUT_TYPE);
      // Server still has the authoritative size cap (HEAD-checked on commit) — this is just
      // a defensive client check so we don't waste an S3 PUT we know will be rejected.
      if (resized.size > presign.maxBytes) {
        toast(t("tooBig"), "error");
        return;
      }
      await uploadAvatarToS3(presign.uploadUrl, resized, OUTPUT_TYPE);
      const committed = await commitAvatarUpload(presign.key);
      onChange(committed.avatarUrl);
      toast(t("uploaded"), "success");
    } catch (err) {
      toast(errorMessage(err, t("uploadFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!currentUrl) return;
    setBusy(true);
    try {
      await deleteAvatar();
      onChange(null);
    } catch (err) {
      toast(errorMessage(err, t("uploadFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        aria-label={t("change")}
        className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition-colors hover:border-accent-300"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-semibold text-slate-700">{initialChar}</span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </span>
      </button>
      <div className="space-y-1">
        <p className="text-xs text-slate-500">{t("hint")}</p>
        {currentUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-600"
          >
            <X className="h-3 w-3" /> {t("remove")}
          </button>
        )}
      </div>
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
