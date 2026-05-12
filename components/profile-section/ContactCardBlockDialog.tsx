"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { useTranslations } from "next-intl";
import { useTranslations as useT } from "next-intl";
import type { ContactCardPalette } from "@/types";
import { PALETTES } from "@/app/[locale]/u/[username]/_components/contact-card-palettes";
import {
  commitProfileImageUpload,
  presignProfileImageUpload,
  uploadAvatarToS3,
} from "@/lib/api";
import { resizeImage } from "@/lib/image-resize";
import { useApiErrorMessage } from "@/lib/error-messages";
import { ConfirmDialog } from "../ui/dialog";
import { Input } from "../ui/input";
import { useToast } from "../ui/toast";
import { FormField } from "./FormField";

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
          logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : null,
          logoFocalX: typeof parsed.logoFocalX === "number" ? parsed.logoFocalX : 50,
          logoFocalY: typeof parsed.logoFocalY === "number" ? parsed.logoFocalY : 50,
          palette:
            typeof parsed.palette === "string"
              ? (parsed.palette as ContactCardPalette)
              : null,
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
            logoUrl: config.logoUrl,
            logoFocalX: config.logoUrl ? config.logoFocalX : 50,
            logoFocalY: config.logoUrl ? config.logoFocalY : 50,
            palette: config.palette,
          }),
        );
      }}
    >
      <div className="mb-3 flex items-start gap-3">
        <LogoFocalEditor
          url={config.logoUrl}
          focalX={config.logoFocalX}
          focalY={config.logoFocalY}
          onUrlChange={(url) =>
            setConfig((c) => ({ ...c, logoUrl: url, logoFocalX: 50, logoFocalY: 50 }))
          }
          onFocalChange={(focalX, focalY) =>
            setConfig((c) => ({ ...c, logoFocalX: focalX, logoFocalY: focalY }))
          }
          t={t}
        />
        <div className="text-[11px] text-slate-500">
          <p className="font-medium text-slate-700">{t("contactFieldLogo")}</p>
          <p className="mt-0.5 text-slate-400">
            {config.logoUrl ? t("contactFieldLogoFocalHint") : t("contactFieldLogoHint")}
          </p>
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

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;
const MAX_DIM = 800;

/**
 * Square logo preview with drag-to-position focal point. The uploaded file keeps its native
 * aspect — the square frame here previews exactly how the public profile renderer crops the logo
 * via {@code object-cover + object-position}. The dot the user drags is the focal point that
 * survives the crop. Same pattern as {@code ProductCardBlockDialog}'s {@code ImageThumbEditor},
 * scaled down to a single tile (no carousel, single image).
 */
function LogoFocalEditor({
  url,
  focalX,
  focalY,
  onUrlChange,
  onFocalChange,
  t,
}: {
  url: string | null;
  focalX: number;
  focalY: number;
  onUrlChange: (url: string | null) => void;
  onFocalChange: (focalX: number, focalY: number) => void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
}) {
  const uploadT = useT("settings.profile.imageUploader");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const fileInput = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  function pointerToFocal(clientX: number, clientY: number) {
    const el = surfaceRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100);
    onFocalChange(Math.round(x), Math.round(y));
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast(uploadT("invalidType"), "error");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast(uploadT("tooBig"), "error");
      return;
    }
    setBusy(true);
    try {
      // Keep native aspect — focal point + object-cover at render time gives the visitor a
      // square crop while letting the editor revisit the focal point later without re-uploading.
      const resized = await resizeImage(file, {
        maxDim: MAX_DIM,
        square: false,
        type: OUTPUT_TYPE,
        quality: OUTPUT_QUALITY,
        filename: "contact-logo.jpg",
      });
      const presign = await presignProfileImageUpload(OUTPUT_TYPE);
      if (resized.size > presign.maxBytes) {
        toast(uploadT("tooBig"), "error");
        return;
      }
      await uploadAvatarToS3(presign.uploadUrl, resized, OUTPUT_TYPE);
      const committed = await commitProfileImageUpload(presign.key);
      onUrlChange(committed.imageUrl);
    } catch (err) {
      toast(errorMessage(err, uploadT("uploadFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!url) {
    return (
      <>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="flex aspect-square w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50/50 text-slate-500 transition hover:border-slate-400 hover:text-slate-700 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span className="text-[10px]">{uploadT("emptyHint")}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          onChange={handlePick}
          className="hidden"
        />
      </>
    );
  }

  return (
    <div className="w-20 shrink-0 space-y-1">
      <div
        ref={surfaceRef}
        className={`relative aspect-square w-full select-none overflow-hidden rounded-md border bg-slate-100 ${
          dragging ? "border-accent-400 ring-2 ring-accent-300" : "border-slate-200"
        }`}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          pointerToFocal(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          pointerToFocal(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          (e.target as Element).releasePointerCapture?.(e.pointerId);
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: `${focalX}% ${focalY}%` }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent-500 shadow-[0_0_0_2px_rgba(0,0,0,0.25)]"
          style={{ left: `${focalX}%`, top: `${focalY}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="text-[10px] text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : uploadT("replace")}
        </button>
        <button
          type="button"
          onClick={() => onUrlChange(null)}
          className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 transition hover:text-red-600"
        >
          <X className="h-2.5 w-2.5" />
          {uploadT("remove")}
        </button>
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

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
