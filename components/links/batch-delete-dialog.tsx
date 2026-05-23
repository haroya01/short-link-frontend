"use client";

import { AlertTriangle } from "lucide-react";
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
  const { toast } = useToast();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="배포 묶음 삭제"
      destructive
      confirmLabel="삭제"
      onConfirm={async () => {
        if (!batch) return;
        try {
          await deleteCampaignBatch(campaignId, batch.id);
          toast("배포 묶음을 삭제했어요", "success");
          onDeleted();
        } catch (err) {
          toast(err instanceof Error ? err.message : "삭제 실패", "error");
        }
      }}
    >
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" aria-hidden />
          <div className="space-y-1.5 text-[12px] leading-snug text-slate-700">
            <p className="font-medium text-rose-700">단축 URL 도 함께 삭제됩니다.</p>
            <p>
              이미 인쇄된 QR 코드를 스캔하면 &lsquo;링크 없음&rsquo; 페이지를 보게 돼요. 발주
              전이라면 안전하지만, 배포 후라면 종료 정책 (REDIRECT) 으로 살리는 쪽을 먼저
              검토하세요.
            </p>
          </div>
        </div>
      </div>
      {batch && (
        <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600">
          <p>
            <span className="font-medium text-slate-900">{batch.name}</span> ·{" "}
            {batch.quantity.toLocaleString()}장
          </p>
          <p className="font-mono text-[11px] text-slate-500">{batch.shortUrl}</p>
        </div>
      )}
    </ConfirmDialog>
  );
}
