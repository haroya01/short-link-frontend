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
import { resizeImage } from "@/lib/image-resize";
import { useToast } from "./ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
/** Long-edge ceiling — banners are landscape, so 2K width preserves crispness on retina laptops
 *  while keeping JPEG payload bounded. Aspect is preserved (not square-cropped). */
const TARGET_DIM = 2048;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.88;

type Props = {
  currentUrl: string | null;
  onChange: (bannerUrl: string | null) => void;
};

/**
 * Wide hero image picker for the public profile. Same upload pipeline as AvatarPicker (presign →
 * direct S3 PUT → commit) with two differences: aspect is preserved (no center-crop), and the
 * preview is a 3:1 strip rather than a circle. The HEAD-and-reject backend guard catches anything
 * that bypasses the canvas resize.
 */
export function BannerPicker({ currentUrl, onChange }: Props) {
  const t = useTranslations("banner");
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
        maxDim: TARGET_DIM,
        square: false,
        type: OUTPUT_TYPE,
        quality: OUTPUT_QUALITY,
        filename: "banner.jpg",
      });
      const presign = await presignBannerUpload(OUTPUT_TYPE);
      if (resized.size > presign.maxBytes) {
        toast(t("tooBig"), "error");
        return;
      }
      await uploadBannerToS3(presign.uploadUrl, resized, OUTPUT_TYPE);
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
        // unstyled image flash during reflow. transition-colors instead of `transition` so the
        // size doesn't animate on layout shifts (which produced the "엄청 커지는" jitter).
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
    </div>
  );
}
