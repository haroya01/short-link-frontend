"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import { useLocale } from "next-intl";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/profile/section/form-field";

type Config = {
  title: string;
  subtitle: string;
  placeholder: string;
  successMessage: string;
};

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
 * Configures an EMAIL_FORM block. Four fields (title / subtitle / placeholder / success message) —
 * shape mirrors the backend JSON. Title is required; the other three have backend defaults so
 * blank is fine on initial create.
 *
 * <p>Dialog also surfaces a "수집된 이메일 보기 →" link to {@code /content/leads} so the seller
 * who just made an EMAIL_FORM block immediately knows where the collected addresses live. The
 * page was orphaned until this dialog started linking to it — sellers were leaving the form on
 * profiles without realizing leads were being saved at all.
 */
export function EmailFormBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const locale = useLocale();
  const [config, setConfig] = useState<Config>({
    title: "",
    subtitle: "",
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
          subtitle: parsed.subtitle ?? "",
          placeholder: parsed.placeholder ?? "",
          successMessage: parsed.successMessage ?? "",
        });
        return;
      } catch {
        /* fall through to defaults */
      }
    }
    setConfig({ title: "", subtitle: "", placeholder: "", successMessage: "" });
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
      maxWidthClass="max-w-xl"
      onConfirm={async () => {
        await onSubmit(
          JSON.stringify({
            title,
            subtitle: config.subtitle.trim() || null,
            placeholder: config.placeholder.trim() || null,
            successMessage: config.successMessage.trim() || null,
          }),
        );
      }}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="space-y-0.5">
            <p>{t("emailFormHowItWorks")}</p>
            <a
              href={`/${locale}/content/leads`}
              className="inline-flex items-center gap-0.5 font-medium underline-offset-2 hover:underline"
            >
              {t("emailFormViewLeadsCta")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <FormField label={t("emailFormFieldTitle")} required>
          <Input
            value={config.title}
            maxLength={60}
            onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
            placeholder={t("emailFormFieldTitlePlaceholder")}
          />
        </FormField>
        <FormField label={t("emailFormFieldSubtitle")}>
          <Textarea
            value={config.subtitle}
            maxLength={200}
            rows={2}
            onChange={(e) => setConfig((c) => ({ ...c, subtitle: e.target.value }))}
            placeholder={t("emailFormFieldSubtitlePlaceholder")}
          />
          <p className="mt-0.5 text-[10px] text-slate-400">{t("emailFormFieldSubtitleHint")}</p>
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
