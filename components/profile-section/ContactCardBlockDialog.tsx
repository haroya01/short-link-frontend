"use client";

import { useEffect, useState } from "react";
import type { useTranslations } from "next-intl";
import { ConfirmDialog } from "../ui/dialog";
import { Input } from "../ui/input";

type Config = {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  website: string;
};

const EMPTY: Config = {
  name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  website: "",
};

type Props = {
  open: boolean;
  /** Non-null when editing — fields pre-populated by parsing this JSON. */
  initialJson: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (configJson: string) => void | Promise<void>;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * 7-field form for a CONTACT_CARD block. Only `name` is required by the backend; rest are saved
 * as null when blank so the rendered card stays compact. JSON shape mirrors the backend record.
 */
export function ContactCardBlockDialog({ open, initialJson, onOpenChange, onSubmit, t }: Props) {
  const [config, setConfig] = useState<Config>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (initialJson) {
      try {
        const parsed = JSON.parse(initialJson);
        setConfig({
          name: parsed.name ?? "",
          title: parsed.title ?? "",
          company: parsed.company ?? "",
          email: parsed.email ?? "",
          phone: parsed.phone ?? "",
          address: parsed.address ?? "",
          website: parsed.website ?? "",
        });
        return;
      } catch {
        /* fall through to defaults */
      }
    }
    setConfig(EMPTY);
  }, [open, initialJson]);

  const name = config.name.trim();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialJson ? t("editContactCardTitle") : t("addContactCardTitle")}
      description={t("addContactCardDescription")}
      confirmLabel={t("save")}
      confirmDisabled={name.length === 0}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await onSubmit(
          JSON.stringify({
            name,
            title: config.title.trim() || null,
            company: config.company.trim() || null,
            email: config.email.trim() || null,
            phone: config.phone.trim() || null,
            address: config.address.trim() || null,
            website: config.website.trim() || null,
          }),
        );
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t("contactFieldName")} required>
          <Input
            value={config.name}
            maxLength={60}
            onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
            placeholder={t("contactFieldNamePlaceholder")}
          />
        </Field>
        <Field label={t("contactFieldTitle")}>
          <Input
            value={config.title}
            maxLength={80}
            onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
            placeholder={t("contactFieldTitlePlaceholder")}
          />
        </Field>
        <Field label={t("contactFieldCompany")}>
          <Input
            value={config.company}
            maxLength={80}
            onChange={(e) => setConfig((c) => ({ ...c, company: e.target.value }))}
            placeholder={t("contactFieldCompanyPlaceholder")}
          />
        </Field>
        <Field label={t("contactFieldPhone")}>
          <Input
            value={config.phone}
            maxLength={30}
            onChange={(e) => setConfig((c) => ({ ...c, phone: e.target.value }))}
            placeholder="+82 10-0000-0000"
          />
        </Field>
        <Field label={t("contactFieldEmail")}>
          <Input
            type="email"
            value={config.email}
            maxLength={254}
            onChange={(e) => setConfig((c) => ({ ...c, email: e.target.value }))}
            placeholder="you@example.com"
          />
        </Field>
        <Field label={t("contactFieldWebsite")}>
          <Input
            type="url"
            value={config.website}
            maxLength={256}
            onChange={(e) => setConfig((c) => ({ ...c, website: e.target.value }))}
            placeholder="https://example.com"
          />
        </Field>
        <Field label={t("contactFieldAddress")} className="sm:col-span-2">
          <Input
            value={config.address}
            maxLength={200}
            onChange={(e) => setConfig((c) => ({ ...c, address: e.target.value }))}
            placeholder={t("contactFieldAddressPlaceholder")}
          />
        </Field>
      </div>
    </ConfirmDialog>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
