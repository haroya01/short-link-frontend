"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Loader2, QrCode, X } from "lucide-react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";
import { truncateMiddle } from "@/lib/utils";

type Props = { url?: string; value?: string; filename?: string };

export function QrButton({ url, value, filename = "qrcode.png" }: Props) {
  const target = url ?? value ?? "";
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!target}>
        <QrCode className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">QR</span>
      </Button>
      {open && <QrModal target={target} filename={filename} onClose={() => setOpen(false)} />}
    </>
  );
}

function QrModal({
  target,
  filename,
  onClose,
}: {
  target: string;
  filename: string;
  onClose: () => void;
}) {
  const t = useTranslations("qr");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(target, {
      width: 512,
      margin: 1,
      color: { dark: "#0F172A", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      toast(t("copied"), "success");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Failed", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="QR 코드"
        className="relative w-full max-w-sm animate-fade-in rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center px-6 py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {t("title")}
          </p>
          <div className="mt-3 flex h-64 w-64 items-center justify-center rounded-md border border-slate-200 bg-white p-2">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="QR code"
                className="h-full w-full"
                draggable={false}
              />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            )}
          </div>
          <p
            className="mt-3 max-w-full truncate text-center text-xs text-slate-500"
            title={target}
          >
            {truncateMiddle(target, 48)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100">
          <button
            type="button"
            onClick={copyUrl}
            disabled={!dataUrl}
            className="flex items-center justify-center gap-1.5 bg-white py-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-accent-600" /> {t("copied")}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> {t("copyUrl")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!dataUrl}
            className="flex items-center justify-center gap-1.5 bg-white py-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {t("downloadPng")}
          </button>
        </div>
      </div>
    </div>
  );
}
