"use client";

import { useEffect, useState } from "react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { FormField } from "./FormField";

type Config = { title: string; placeholder: string; successMessage: string };

type Props = {
  open: boolean;
  /** When non-null, dialog is in edit mode and the fields are pre-populated. */
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  /** Receives a JSON string ready for the backend. Caller does the network call. */
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Configures an EMAIL_FORM block. Three fields (title / placeholder / success message) — same
 * shape the backend persists as JSON in {@code profile_block.content}. Title is required; the
 * other two have backend defaults so blank is fine on initial create.
 */
export function EmailFormBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [config, setConfig] = useState<Config>({
    title: "",
    placeholder: "",
    successMessage: "",
  });

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        setConfig({
          title: parsed.title ?? "",
          placeholder: parsed.placeholder ?? "",
          successMessage: parsed.successMessage ?? "",
        });
        return;
      } catch {
        /* fall through to defaults */
      }
    }
    setConfig({ title: "", placeholder: "", successMessage: "" });
  }, [open, initialJson]);

  const title = config.title.trim();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editEmailFormTitle") : t("addEmailFormTitle")}
      description={t("addEmailFormDescription")}
      confirmLabel={t("save")}
      confirmDisabled={title.length === 0}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(
          JSON.stringify({
            title,
            placeholder: config.placeholder.trim() || null,
            successMessage: config.successMessage.trim() || null,
          }),
        );
      }}
    >
      <div className="space-y-3">
        <FormField label={t("emailFormFieldTitle")} required>
          <Input
            value={config.title}
            maxLength={60}
            onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
            placeholder={t("emailFormFieldTitlePlaceholder")}
          />
        </FormField>
        <FormField label={t("emailFormFieldPlaceholder")}>
          <Input
            value={config.placeholder}
            maxLength={60}
            onChange={(e) => setConfig((c) => ({ ...c, placeholder: e.target.value }))}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label={t("emailFormFieldSuccess")}>
          <Input
            value={config.successMessage}
            maxLength={120}
            onChange={(e) => setConfig((c) => ({ ...c, successMessage: e.target.value }))}
            placeholder={t("emailFormFieldSuccessPlaceholder")}
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}

