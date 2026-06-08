"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { bulkImportLinks } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import type { BulkImportSummary } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

export function BulkImportDialog({ open, onClose, onImported }: Props) {
  const t = useTranslations("dashboard.bulkImport");
  const errorMessage = useApiErrorMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setFile(null);
    setBusy(false);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return;
    setBusy(true);
    try {
      const summary = await bulkImportLinks(file);
      setResult(summary);
      onImported();
    } catch (err) {
      setError(errorMessage(err, t("uploadFailed")));
    } finally {
      setBusy(false);
    }
  }

  function downloadResultCsv() {
    if (!result) return;
    const blob = new Blob([result.resultCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={close} />
      <div className="relative w-full max-w-md animate-fade-in rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("description")}</p>
            <pre className="overflow-x-auto rounded bg-slate-50 dark:bg-slate-800/50 px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              url,custom_code,expires_at{"\n"}
              https://example.com/a,,{"\n"}
              https://example.com/b,promo,2026-12-31T00:00:00Z
            </pre>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={busy}
                className="block flex-1 text-xs file:mr-3 file:rounded file:border file:border-slate-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-50"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("limitHint")}</p>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="accent" disabled={busy || !file}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                {busy ? t("uploading") : t("upload")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {t("resultSummary", { ok: result.ok, failed: result.failed })}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("resultHint")}</p>
            </div>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadResultCsv}>
                {t("downloadResult")}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  {t("uploadAnother")}
                </Button>
                <Button type="button" variant="accent" size="sm" onClick={close}>
                  {t("done")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
