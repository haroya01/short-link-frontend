"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("campaignApp.batchDialogs");
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
      title={t("editTitle")}
      description={t("editDescription")}
      confirmLabel={t("save")}
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
          toast(t("updated"), "success");
          onUpdated();
        } catch (err) {
          toast(err instanceof Error ? err.message : t("updateFailed"), "error");
        }
      }}
    >
      <div className="space-y-3">
        <Field label={t("name")} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("distributor")}>
            <Input
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              maxLength={255}
            />
          </Field>
          <Field label={t("area")}>
            <Input value={area} onChange={(e) => setArea(e.target.value)} maxLength={255} />
          </Field>
        </div>
        <Field label={t("quantity")} required>
          <Input
            type="number"
            min="1"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field label={t("memo")}>
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
