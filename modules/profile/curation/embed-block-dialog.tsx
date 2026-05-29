"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, CheckCircle2, AlertCircle } from "lucide-react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/modules/profile/curation/form-field";
import { EMBED_PROVIDERS, resolveEmbedProvider } from "@/modules/profile/curation/embed-providers";

type Props = {
  open: boolean;
  /** Current URL when editing; null when creating. */
  initialUrl: string | null;
  onOpenChange: (open: boolean) => void;
  /** Final URL the dialog persists — backend stores the raw URL string, not JSON. */
  onSubmit: (url: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Editor for an EMBED block — replaces the previous {@code window.prompt} flow so the UI matches the
 * other block dialogs (booking, gallery, etc.). The provider whitelist is mirrored from the backend
 * just to drive the inline "✓ YouTube / ✗ unsupported" hint; the backend remains authoritative on
 * validation, so a host the client misses will still be rejected on save.
 */
export function EmbedBlockDialog({ open, initialUrl, onOpenChange, onSubmit, t }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(initialUrl ?? "");
  }, [open, initialUrl]);

  const trimmed = value.trim();
  const provider = useMemo(() => resolveEmbedProvider(trimmed), [trimmed]);
  const showProviderHint = trimmed.length > 0;
  const canSave = trimmed.length > 0 && provider != null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialUrl ? t("editEmbedTitle") : t("addEmbedTitle")}
      description={t("addEmbedDescription")}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        if (!canSave) return;
        await onSubmit(trimmed);
      }}
    >
      <div className="space-y-3">
        <FormField label={t("embedFieldUrl")} required>
          <Input
            type="url"
            value={value}
            maxLength={2048}
            placeholder="https://www.youtube.com/watch?v=..."
            onChange={(e) => setValue(e.target.value)}
          />
          {showProviderHint && (
            <p
              className={
                "mt-1 flex items-center gap-1 text-[11px] " +
                (provider ? "text-emerald-600" : "text-red-600")
              }
            >
              {provider ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  {provider.name}
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  {t("embedUnsupportedProvider")}
                </>
              )}
            </p>
          )}
        </FormField>

        <div className="rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <Play className="h-3 w-3" />
            {t("embedSupportedProviders")}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            {EMBED_PROVIDERS.map((p) => p.name).join(" · ")}
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
