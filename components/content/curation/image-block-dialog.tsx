"use client";

import { useEffect, useState } from "react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/content/curation/image-uploader";

type Props = {
  open: boolean;
  /** Current public URL when editing; null when creating. */
  initialUrl: string | null;
  onOpenChange: (open: boolean) => void;
  /** Final URL the dialog persists — empty string is rejected, only a real URL goes through. */
  onSubmit: (url: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Single-image picker for the IMAGE block — replaces the previous URL-prompt flow. Reuses the
 * same {@link ImageUploader} component the gallery / product-card editors use, so the upload
 * path (resize → presigned PUT → commit) is identical. Backend stays unchanged: the IMAGE
 * block's persisted content is still a public URL, just the input affordance changed.
 */
export function ImageBlockDialog({ open, initialUrl, onOpenChange, onSubmit, t }: Props) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialUrl);
  }, [open, initialUrl]);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialUrl ? t("editImageTitle") : t("addImageTitle")}
      description={t("addImageDescriptionUpload")}
      confirmLabel={t("save")}
      confirmDisabled={!value || value.length === 0}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        if (!value) return;
        await onSubmit(value);
      }}
    >
      <ImageUploader value={value} onChange={setValue} aspectClass="aspect-[4/3]" />
    </ConfirmDialog>
  );
}
