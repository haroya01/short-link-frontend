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
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  currentUrl: string | null;
  /** Used as a fallback initial when no avatar is set yet. */
  initialChar: string;
  onChange: (avatarUrl: string | null) => void;
};

export function AvatarPicker({ currentUrl, initialChar, onChange }: Props) {
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
    if (file.size > MAX_BYTES) {
      toast(t("tooBig"), "error");
      return;
    }
    setBusy(true);
    try {
      const presign = await presignAvatarUpload(file.type);
      // Server can override our local cap (e.g. config bump) so honor whichever is smaller.
      if (file.size > presign.maxBytes) {
        toast(t("tooBig"), "error");
        return;
      }
      await uploadAvatarToS3(presign.uploadUrl, file, file.type);
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
        className="group relative grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition hover:border-accent-300"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-semibold text-slate-700">{initialChar}</span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
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
