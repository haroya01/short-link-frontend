"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/content/curation/form-field";
import { BOOKING_PROVIDERS, resolveBookingProvider } from "@/components/content/curation/booking-providers";

type Config = {
  url: string;
  title: string;
  description: string;
  ctaLabel: string;
};

const EMPTY: Config = { url: "", title: "", description: "", ctaLabel: "" };

type Props = {
  open: boolean;
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Editor for a BOOKING block. The URL is the only required field; the backend rejects any host
 * outside the provider whitelist. We mirror the whitelist client-side just to show "✓ Calendly /
 * ✗ unsupported" inline, but the backend remains authoritative on validation.
 */
export function BookingBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [config, setConfig] = useState<Config>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        setConfig({
          url: parsed.url ?? "",
          title: parsed.title ?? "",
          description: parsed.description ?? "",
          ctaLabel: parsed.ctaLabel ?? "",
        });
        return;
      } catch {
        /* fall through */
      }
    }
    setConfig(EMPTY);
  }, [open, initialJson]);

  const trimmedUrl = config.url.trim();
  const provider = useMemo(() => resolveBookingProvider(trimmedUrl), [trimmedUrl]);
  const showProviderHint = trimmedUrl.length > 0;
  const canSave = trimmedUrl.length > 0 && provider != null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editBookingTitle") : t("addBookingTitle")}
      description={t("addBookingDescription")}
      confirmLabel={t("save")}
      confirmDisabled={!canSave}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(
          JSON.stringify({
            url: trimmedUrl,
            title: config.title.trim() || null,
            description: config.description.trim() || null,
            ctaLabel: config.ctaLabel.trim() || null,
          }),
        );
      }}
    >
      <div className="space-y-3">
        <FormField label={t("bookingFieldUrl")} required>
          <Input
            type="url"
            value={config.url}
            maxLength={512}
            placeholder="https://calendly.com/me/30min"
            onChange={(e) => setConfig((c) => ({ ...c, url: e.target.value }))}
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
                  {t("bookingUnsupportedProvider")}
                </>
              )}
            </p>
          )}
        </FormField>

        <FormField label={t("bookingFieldTitle")}>
          <Input
            value={config.title}
            maxLength={60}
            placeholder={t("bookingFieldTitlePlaceholder")}
            onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
          />
        </FormField>

        <FormField label={t("bookingFieldDescription")}>
          <Input
            value={config.description}
            maxLength={160}
            placeholder={t("bookingFieldDescriptionPlaceholder")}
            onChange={(e) => setConfig((c) => ({ ...c, description: e.target.value }))}
          />
        </FormField>

        <FormField label={t("bookingFieldCtaLabel")}>
          <Input
            value={config.ctaLabel}
            maxLength={30}
            placeholder={t("bookingFieldCtaLabelPlaceholder")}
            onChange={(e) => setConfig((c) => ({ ...c, ctaLabel: e.target.value }))}
          />
        </FormField>

        <div className="rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <Calendar className="h-3 w-3" />
            {t("bookingSupportedProviders")}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            {BOOKING_PROVIDERS.map((p) => p.name).join(" · ")}
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}

