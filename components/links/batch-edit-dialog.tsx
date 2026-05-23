"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateCampaignBatch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { CampaignBatch } from "@/types";

export function BatchEditDialog({
  open,
  onOpenChange,
  batch,
  campaignId,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  batch: CampaignBatch | null;
  campaignId: number;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [distributor, setDistributor] = useState("");
  const [area, setArea] = useState("");
  const [quantity, setQuantity] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!batch) return;
    setName(batch.name);
    setDistributor(batch.distributorName ?? "");
    setArea(batch.areaLabel ?? "");
    setQuantity(String(batch.quantity));
    setMemo(batch.memo ?? "");
  }, [batch]);

  const q = parseInt(quantity, 10);
  const canConfirm =
    name.trim().length > 0 && Number.isFinite(q) && q > 0 && batch !== null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="배포 묶음 편집"
      description="이름·배포자·지역·수량·메모만 수정할 수 있어요. 단축 URL (인쇄된 QR) 은 그대로 유지됩니다."
      confirmLabel="저장"
      confirmDisabled={!canConfirm}
      onConfirm={async () => {
        if (!batch) return;
        try {
          await updateCampaignBatch(campaignId, batch.id, {
            name: name.trim(),
            distributorName: distributor.trim() || undefined,
            areaLabel: area.trim() || undefined,
            quantity: q,
            memo: memo.trim() || undefined,
          });
          toast("배포 묶음을 수정했어요", "success");
          onUpdated();
        } catch (err) {
          toast(err instanceof Error ? err.message : "수정 실패", "error");
        }
      }}
    >
      <div className="space-y-3">
        <Field label="묶음 이름" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="배포자">
            <Input
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              maxLength={255}
            />
          </Field>
          <Field label="지역">
            <Input value={area} onChange={(e) => setArea(e.target.value)} maxLength={255} />
          </Field>
        </div>
        <Field label="수량" required>
          <Input
            type="number"
            min="1"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field label="메모">
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            maxLength={500}
          />
        </Field>
      </div>
    </ConfirmDialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-accent-700">*</span>}
      </label>
      {children}
    </div>
  );
}
