"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "../ui/dialog";
import { Input } from "../ui/input";

const MAX_IMAGES = 6;

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Image-URL list editor for a GALLERY block. Backend caps at 6; we mirror the cap here so the
 * user gets immediate feedback when they hit it instead of a 400 after Save. URLs are validated
 * on the server — we just shape them and leave the fail-fast UX to the response toast.
 */
export function GalleryBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [urls, setUrls] = useState<string[]>([""]);

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        if (Array.isArray(parsed?.images)) {
          const cleaned = parsed.images.filter(
            (v: unknown): v is string => typeof v === "string",
          );
          setUrls(cleaned.length > 0 ? cleaned : [""]);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    setUrls([""]);
  }, [open, initialJson]);

  function updateUrl(idx: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  }

  function addRow() {
    setUrls((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, ""]));
  }

  function removeRow(idx: number) {
    setUrls((prev) => (prev.length === 1 ? [""] : prev.filter((_, i) => i !== idx)));
  }

  const cleaned = urls.map((u) => u.trim()).filter((u) => u.length > 0);
  const canSave = cleaned.length > 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editGalleryTitle") : t("addGalleryTitle")}
      description={t("addGalleryDescription", { max: MAX_IMAGES })}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(JSON.stringify({ images: cleaned }));
      }}
    >
      <div className="space-y-2">
        {urls.map((url, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-[11px] text-slate-400">
              {idx + 1}
            </span>
            <Input
              type="url"
              value={url}
              maxLength={256}
              placeholder="https://images.example.com/photo.jpg"
              onChange={(e) => updateUrl(idx, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeRow(idx)}
              aria-label={t("remove")}
              className="text-slate-400 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
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
