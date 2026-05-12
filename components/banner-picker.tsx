"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  commitBannerUpload,
  deleteBanner,
  presignBannerUpload,
  uploadBannerToS3,
} from "@/lib/api";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { ImageCropperDialog } from "./ui/image-cropper-dialog";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** Long-edge ceiling — banners are landscape, so 2K width preserves crispness on retina laptops
 *  while keeping JPEG payload bounded. */
const TARGET_DIM = 2048;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.88;

type Props = {
  currentUrl: string | null;
  onChange: (bannerUrl: string | null) => void;
};

/**
 * Wide hero image picker for the public profile. File pick → {@link ImageCropperDialog} at 3:1
 * → presigned S3 PUT → commit. The cropper replaced the old "shrink to fit, no preview" flow so
 * users can choose which slice of a landscape (or portrait) photo lands in the 3:1 banner frame.
 */
export function BannerPicker({ currentUrl, onChange }: Props) {
  const t = useTranslations("banner");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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
      const presign = await presignBannerUpload(OUTPUT_TYPE);
      if (cropped.size > presign.maxBytes) {
        toast(t("tooBig"), "error");
        return;
      }
      await uploadBannerToS3(presign.uploadUrl, cropped, OUTPUT_TYPE);
      const committed = await commitBannerUpload(presign.key);
      onChange(committed.bannerUrl);
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
      await deleteBanner();
      onChange(null);
    } catch (err) {
      toast(errorMessage(err, t("uploadFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">{t("label")}</p>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={busy}
        aria-label={t("change")}
        // aspect-ratio + relative + min-h-0 keeps the button locked to 3:1 regardless of an
        // unstyled image flash during reflow.
        className="group relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition-colors hover:border-accent-300"
        style={{ aspectRatio: "3 / 1" }}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <ImagePlus className="h-4 w-4" />
              {t("addCta")}
            </span>
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </span>
      </button>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{t("hint")}</span>
        {currentUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex items-center gap-1 hover:text-red-600"
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
      <ImageCropperDialog
        open={pickedFile !== null}
        file={pickedFile}
        aspect={3}
        cropShape="rect"
        outputMaxDim={TARGET_DIM}
        outputType={OUTPUT_TYPE}
        outputQuality={OUTPUT_QUALITY}
        onCancel={() => setPickedFile(null)}
        onConfirm={handleCropped}
      />
    </div>
  );
}
