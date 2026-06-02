"use client";

import type { useTranslations } from "next-intl";
import type { ContactCardPalette } from "@/types";
import { PALETTES } from "@/app/[locale]/u/[username]/_components/contact-card-palettes";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/modules/profile/curation/form-field";
import { ImageUploader } from "@/modules/profile/curation/image-uploader";
import { useBlockDialogForm } from "@/modules/profile/curation/use-block-dialog-form";

type Config = {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logoUrl: string | null;
  logoFocalX: number;
  logoFocalY: number;
  palette: ContactCardPalette | null;
};

const EMPTY: Config = {
  name: "",
  title: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  logoUrl: null,
  logoFocalX: 50,
  logoFocalY: 50,
  palette: null,
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
  const [config, setConfig] = useBlockDialogForm<Config>(open, initialJson, (raw) => {
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          name: parsed.name ?? "",
          title: parsed.title ?? "",
          company: parsed.company ?? "",
          email: parsed.email ?? "",
          phone: parsed.phone ?? "",
          address: parsed.address ?? "",
          website: parsed.website ?? "",
          logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : null,
          logoFocalX: typeof parsed.logoFocalX === "number" ? parsed.logoFocalX : 50,
          logoFocalY: typeof parsed.logoFocalY === "number" ? parsed.logoFocalY : 50,
          palette:
            typeof parsed.palette === "string" ? (parsed.palette as ContactCardPalette) : null,
        };
      } catch {
        /* fall through to defaults */
      }
    }
    return EMPTY;
  });

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
            logoUrl: config.logoUrl,
            logoFocalX: config.logoUrl ? config.logoFocalX : 50,
            logoFocalY: config.logoUrl ? config.logoFocalY : 50,
            palette: config.palette,
          }),
        );
      }}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="w-20">
          <ImageUploader
            value={config.logoUrl}
            onChange={(url) =>
              setConfig((c) => ({ ...c, logoUrl: url, logoFocalX: 50, logoFocalY: 50 }))
            }
            aspectClass="aspect-square"
            cropAspect={1}
          />
        </div>
        <div className="text-[11px] text-slate-500">
          <p className="font-medium text-slate-700">{t("contactFieldLogo")}</p>
          <p className="mt-0.5 text-slate-400">{t("contactFieldLogoHint")}</p>
        </div>
      </div>
      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-slate-700">
          {t("contactFieldPalette")}
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PALETTES.map((p) => {
            const active = (config.palette ?? "amethyst") === p.id;
            const previewBg = `linear-gradient(110deg, ${p.colors[0]}, ${p.colors[1]}, ${p.colors[2]}, ${p.colors[3]}, ${p.colors[4]}, ${p.colors[5]})`;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setConfig((c) => ({ ...c, palette: p.id }))
                }
                aria-pressed={active}
                title={p.label}
                className={
                  "group flex flex-col items-center gap-1 rounded-md p-1 transition " +
                  (active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100")
                }
              >
                <span
                  className={
                    "block h-7 w-full rounded ring-1 " +
                    (active ? "ring-white/40" : "ring-slate-200")
                  }
                  style={{ backgroundImage: previewBg }}
                />
                <span className="text-[10px] font-medium leading-none">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label={t("contactFieldName")} required>
          <Input
            value={config.name}
            maxLength={60}
            onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
            placeholder={t("contactFieldNamePlaceholder")}
          />
        </FormField>
        <FormField label={t("contactFieldTitle")}>
          <Input
            value={config.title}
            maxLength={80}
            onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
            placeholder={t("contactFieldTitlePlaceholder")}
          />
        </FormField>
        <FormField label={t("contactFieldCompany")}>
          <Input
            value={config.company}
            maxLength={80}
            onChange={(e) => setConfig((c) => ({ ...c, company: e.target.value }))}
            placeholder={t("contactFieldCompanyPlaceholder")}
          />
        </FormField>
        <FormField label={t("contactFieldPhone")}>
          <Input
            value={config.phone}
            maxLength={30}
            onChange={(e) => setConfig((c) => ({ ...c, phone: e.target.value }))}
            placeholder="+82 10-0000-0000"
          />
        </FormField>
        <FormField label={t("contactFieldEmail")}>
          <Input
            type="email"
            value={config.email}
            maxLength={254}
            onChange={(e) => setConfig((c) => ({ ...c, email: e.target.value }))}
            placeholder="you@example.com"
          />
        </FormField>
        <FormField label={t("contactFieldWebsite")}>
          <Input
            type="url"
            value={config.website}
            maxLength={256}
            onChange={(e) => setConfig((c) => ({ ...c, website: e.target.value }))}
            placeholder="https://example.com"
          />
        </FormField>
        <FormField label={t("contactFieldAddress")} className="sm:col-span-2">
          <Input
            value={config.address}
            maxLength={200}
            onChange={(e) => setConfig((c) => ({ ...c, address: e.target.value }))}
            placeholder={t("contactFieldAddressPlaceholder")}
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}
