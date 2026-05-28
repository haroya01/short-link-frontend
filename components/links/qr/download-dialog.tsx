"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  campaignBatchQrUrl,
  campaignBatchesZipUrl,
  requestBlob,
  type QrDownloadOptions,
} from "@/lib/api";

type Target =
  | { kind: "zip"; campaignId: number }
  | { kind: "single"; campaignId: number; batchId: number; batchName: string };

const DEFAULTS: QrDownloadOptions = { size: 512, ec: "M", label: false };

const SIZE_OPTIONS: { value: QrDownloadOptions["size"]; label: string; hintKey: string }[] = [
  { value: 256, label: "256 px", hintKey: "preview" },
  { value: 512, label: "512 px", hintKey: "online" },
  { value: 1024, label: "1024 px", hintKey: "print" },
  { value: 2048, label: "2048 px", hintKey: "poster" },
];

const EC_OPTIONS: { value: QrDownloadOptions["ec"]; label: string; hintKey: string }[] = [
  { value: "L", label: "L · 7%", hintKey: "data" },
  { value: "M", label: "M · 15%", hintKey: "standard" },
  { value: "Q", label: "Q · 25%", hintKey: "outdoor" },
  { value: "H", label: "H · 30%", hintKey: "maximum" },
];

/**
 * QR 다운로드 옵션 dialog — ZIP (캠페인 전체) 또는 단일 PNG 양쪽에서 사용. 옵션은 캠페인/배치 도메인에
 * 저장 안 됨 — 다운로드마다 자유롭게 (한 번은 미리보기 256px, 한 번은 인쇄 1024px).
 */
export function QrDownloadDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: Target | null;
}) {
  const t = useTranslations("qrDownload");
  const [size, setSize] = useState<QrDownloadOptions["size"]>(DEFAULTS.size);
  const [ec, setEc] = useState<QrDownloadOptions["ec"]>(DEFAULTS.ec);
  const [label, setLabel] = useState<boolean>(DEFAULTS.label);

  useEffect(() => {
    if (open) {
      setSize(DEFAULTS.size);
      setEc(DEFAULTS.ec);
      setLabel(DEFAULTS.label);
    }
  }, [open]);

  if (!target) {
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        title=""
        onConfirm={() => Promise.resolve()}
      >
        {null}
      </ConfirmDialog>
    );
  }

  const title =
    target.kind === "zip" ? t("zipTitle") : t("singleTitle", { name: target.batchName });
  const description =
    target.kind === "zip"
      ? t("zipDescription")
      : t("singleDescription");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={t("confirm")}
      maxWidthClass="max-w-lg"
      onConfirm={async () => {
        const options: Partial<QrDownloadOptions> = { size, ec, label };
        const url =
          target.kind === "zip"
            ? campaignBatchesZipUrl(target.campaignId, options)
            : campaignBatchQrUrl(target.campaignId, target.batchId, options);
        await triggerDownload(url);
      }}
    >
      <div className="space-y-4">
        <OptionGroup label={t("sizeLabel")}>
          <div className="grid grid-cols-4 gap-1.5">
            {SIZE_OPTIONS.map((opt) => (
              <SegmentButton
                key={opt.value}
                active={size === opt.value}
                onClick={() => setSize(opt.value)}
                primary={opt.label}
                secondary={t(`sizes.${opt.hintKey}`)}
              />
            ))}
          </div>
        </OptionGroup>
        <OptionGroup
          label={t("ecLabel")}
          hint={t("ecHint")}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {EC_OPTIONS.map((opt) => (
              <SegmentButton
                key={opt.value}
                active={ec === opt.value}
                onClick={() => setEc(opt.value)}
                primary={opt.label}
                secondary={t(`ec.${opt.hintKey}`)}
              />
            ))}
          </div>
        </OptionGroup>
        <OptionGroup label={t("labelText")} hint={t("labelHint")}>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={label}
              onChange={(e) => setLabel(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-accent-600 focus:ring-accent-500"
            />
            <span className="text-[13px] text-slate-700">{t("labelCheckbox")}</span>
          </label>
        </OptionGroup>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <Download className="mr-1 inline-block h-3 w-3" aria-hidden />
          {t("notSaved")}
        </div>
      </div>
    </ConfirmDialog>
  );
}

function OptionGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-[12px] font-medium text-slate-700">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  primary,
  secondary,
}: {
  active: boolean;
  onClick: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-colors " +
        (active
          ? "border-accent-600 bg-accent-50 text-accent-700"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
      }
    >
      <span className="text-[12px] font-medium">{primary}</span>
      <span className="mt-0.5 text-[10px] leading-tight text-slate-500">{secondary}</span>
    </button>
  );
}

async function triggerDownload(url: string) {
  const { blob, filename } = await requestBlob(url, { method: "GET" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename ?? "download";
  a.rel = "noopener";
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
