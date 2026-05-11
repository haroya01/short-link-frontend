"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "../ui/dialog";
import { ImageUploader } from "./ImageUploader";

const MAX_IMAGES = 6;

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * File-upload editor for a GALLERY block — replaces the prior URL-input version. Each slot is an
 * {@link ImageUploader} that handles resize → presign → S3 PUT → commit and reports the public
 * URL back to this dialog. The slot's URL is the persisted value, so the rendered carousel + the
 * backend validators (which expect http(s) URLs) need no changes. Backend caps at 6 images.
 */
export function GalleryBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [urls, setUrls] = useState<(string | null)[]>([null]);

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        if (Array.isArray(parsed?.images)) {
          const cleaned = parsed.images.filter(
            (v: unknown): v is string => typeof v === "string",
          );
          setUrls(cleaned.length > 0 ? cleaned : [null]);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    setUrls([null]);
  }, [open, initialJson]);

  function updateSlot(idx: number, value: string | null) {
    setUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  }

  function addRow() {
    setUrls((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, null]));
  }

  function removeRow(idx: number) {
    setUrls((prev) => (prev.length === 1 ? [null] : prev.filter((_, i) => i !== idx)));
  }

  const cleaned = urls.filter((u): u is string => typeof u === "string" && u.length > 0);
  const canSave = cleaned.length > 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editGalleryTitle") : t("addGalleryTitle")}
      description={t("addGalleryDescriptionUpload", { max: MAX_IMAGES })}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(JSON.stringify({ images: cleaned }));
      }}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {urls.map((url, idx) => (
            <div key={idx} className="relative">
              <ImageUploader
                value={url}
                onChange={(next) => updateSlot(idx, next)}
                aspectClass="aspect-square"
                removable={false}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  aria-label={t("remove")}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white opacity-80 transition hover:opacity-100"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={urls.length >= MAX_IMAGES}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("galleryAddRow")}
          <span className="text-[10px] text-slate-400">
            ({urls.length}/{MAX_IMAGES})
          </span>
        </button>
      </div>
    </ConfirmDialog>
  );
}
