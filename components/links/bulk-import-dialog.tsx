"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { bulkImportLinks } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";
import { cn } from "@/lib/utils";
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
  const fileInputId = useId();
  const uploaded = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  async function upload() {
    setError(null);
    if (!file) throw new Error("no-file");
    try {
      const summary = await bulkImportLinks(file);
      uploaded.current = true;
      setResult(summary);
      onImported();
    } catch (err) {
      setError(errorMessage(err, t("uploadFailed")));
      throw err;
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
    <>
      <ConfirmDialog
        open={open && !result}
        onOpenChange={(next) => {
          if (next) return;
          if (uploaded.current) {
            uploaded.current = false;
            return;
          }
          close();
        }}
        title={t("title")}
        description={t("description")}
        confirmLabel={t("upload")}
        busyLabel={t("uploading")}
        cancelLabel={t("cancel")}
        confirmDisabled={!file}
        onConfirm={upload}
        compact
      >
        <div className="space-y-3">
          <pre className="overflow-x-auto rounded-md bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            url,custom_code,expires_at{"\n"}
            https://example.com/a,,{"\n"}
            https://example.com/b,promo,2026-12-31T00:00:00Z
          </pre>
          <div className="flex min-w-0 items-center gap-3">
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
              className="peer sr-only"
            />
            <label
              htmlFor={fileInputId}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--focus-ink))] peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-850",
              )}
            >
              {t("chooseFile")}
            </label>
            <span className="min-w-0 truncate text-[13px] text-slate-600 dark:text-slate-300">
              {file?.name ?? t("noFile")}
            </span>
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400">{t("limitHint")}</p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={open && result !== null}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title={result ? t("resultSummary", { ok: result.ok, failed: result.failed }) : t("title")}
        description={t("resultHint")}
        confirmLabel={t("downloadResult")}
        cancelLabel={t("done")}
        onConfirm={downloadResultCsv}
      />
    </>
  );
}
