"use client";

import { useState } from "react";
import { ExternalLink, Pencil, QrCode, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { QrDownloadDialog } from "@/components/links/qr/download-dialog";
import type { CampaignBatch } from "@/types";

type Props = {
  batch: CampaignBatch;
  campaignId: number;
  canModify: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function BatchCard({ batch, campaignId, canModify, onEdit, onDelete }: Props) {
  const t = useTranslations("campaignApp.batchCard");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  return (
    <li className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{batch.name}</h3>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {t("quantityUnit", { count: batch.quantity.toLocaleString() })}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-500 dark:text-slate-400">
        {batch.distributorName && (
          <span>{t("distributor", { name: batch.distributorName })}</span>
        )}
        {batch.areaLabel && <span>· {batch.areaLabel}</span>}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <a
          href={batch.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-1.5 truncate text-[12px] font-medium text-accent-700 dark:text-accent-400 hover:underline"
        >
          <span className="truncate">{batch.shortUrl}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </a>
        <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setQrDialogOpen(true)}
            aria-label={t("downloadQr", { name: batch.name })}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <QrCode className="h-3.5 w-3.5" aria-hidden />
          </button>
          {canModify && (
            <>
              <button
                type="button"
                onClick={onEdit}
                aria-label={t("edit", { name: batch.name })}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={t("delete", { name: batch.name })}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>
      <QrDownloadDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        target={{
          kind: "single",
          campaignId,
          batchId: batch.id,
          batchName: batch.name,
        }}
      />
    </li>
  );
}
