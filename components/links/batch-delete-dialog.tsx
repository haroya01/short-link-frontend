"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { deleteCampaignBatch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { CampaignBatch } from "@/types";

export function BatchDeleteDialog({
  open,
  onOpenChange,
  batch,
  campaignId,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  batch: CampaignBatch | null;
  campaignId: number;
  onDeleted: () => void;
}) {
  const t = useTranslations("campaignApp.batchDialogs");
  const { toast } = useToast();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteTitle")}
      destructive
      confirmLabel={t("delete")}
      onConfirm={async () => {
        if (!batch) return;
        try {
          await deleteCampaignBatch(campaignId, batch.id);
          toast(t("deleted"), "success");
          onDeleted();
        } catch (err) {
          toast(err instanceof Error ? err.message : t("deleteFailed"), "error");
        }
      }}
    >
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" aria-hidden />
          <div className="space-y-1.5 text-[12px] leading-snug text-slate-700 dark:text-slate-300">
            <p className="font-medium text-rose-700">{t("deleteWarningTitle")}</p>
            <p>{t("deleteWarningBody")}</p>
          </div>
        </div>
      </div>
      {batch && (
        <div className="mt-3 space-y-1 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-[12px] text-slate-600 dark:text-slate-300">
          <p>
            <span className="font-medium text-slate-900 dark:text-slate-100">{batch.name}</span> ·{" "}
            {t("quantityUnit", { count: batch.quantity.toLocaleString() })}
          </p>
          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{batch.shortUrl}</p>
        </div>
      )}
    </ConfirmDialog>
  );
}
