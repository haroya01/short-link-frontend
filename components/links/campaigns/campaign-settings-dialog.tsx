"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useApiErrorMessage } from "@/lib/error-messages";
import { updateCampaign } from "@/lib/api";
import { CampaignField, PostEndFields, toLocalInput } from "@/components/links/campaigns/campaign-fields";
import type { CampaignDetail, CampaignPostEndAction, CampaignUpdatePayload } from "@/types";

export function CampaignSettingsDialog({
  open,
  onOpenChange,
  campaign,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignDetail;
  onSaved: () => void;
}) {
  const t = useTranslations("campaignApp.detail.settings");
  const tNew = useTranslations("campaignApp.new");
  const tErr = useTranslations("errors");
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [name, setName] = useState(campaign.name);
  const [endsAtLocal, setEndsAtLocal] = useState(toLocalInput(new Date(campaign.endsAt)));
  const [defaultUrl, setDefaultUrl] = useState(campaign.defaultDestinationUrl ?? "");
  const [action, setAction] = useState<CampaignPostEndAction>(campaign.postEndAction);
  const [message, setMessage] = useState(campaign.postEndMessage ?? "");
  const [redirectUrl, setRedirectUrl] = useState(campaign.postEndDestinationUrl ?? "");

  useEffect(() => {
    if (!open) return;
    setName(campaign.name);
    setEndsAtLocal(toLocalInput(new Date(campaign.endsAt)));
    setDefaultUrl(campaign.defaultDestinationUrl ?? "");
    setAction(campaign.postEndAction);
    setMessage(campaign.postEndMessage ?? "");
    setRedirectUrl(campaign.postEndDestinationUrl ?? "");
  }, [open, campaign]);

  const endEditable = campaign.status === "DRAFT" || campaign.status === "ACTIVE";
  const floor = Math.max(new Date(campaign.startsAt).getTime(), Date.now());
  const periodInvalid = endEditable && (!endsAtLocal || new Date(endsAtLocal).getTime() <= floor);
  const canConfirm =
    name.trim().length > 0 && !periodInvalid && (action !== "REDIRECT" || redirectUrl.trim().length > 0);

  function changes(): CampaignUpdatePayload {
    const payload: CampaignUpdatePayload = {};
    if (name.trim() !== campaign.name) payload.name = name.trim();
    const endsAt = new Date(endsAtLocal).toISOString();
    if (endEditable && toLocalInput(new Date(campaign.endsAt)) !== endsAtLocal) payload.endsAt = endsAt;
    if (defaultUrl.trim() !== (campaign.defaultDestinationUrl ?? "")) payload.defaultDestinationUrl = defaultUrl.trim();
    if (action !== campaign.postEndAction) payload.postEndAction = action;
    if (action === "REDIRECT" && redirectUrl.trim() !== (campaign.postEndDestinationUrl ?? "")) {
      payload.postEndDestinationUrl = redirectUrl.trim();
    }
    if (action === "EXPIRE" && message.trim() !== (campaign.postEndMessage ?? "")) payload.postEndMessage = message.trim();
    return payload;
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      confirmLabel={t("save")}
      confirmDisabled={!canConfirm}
      maxWidthClass="max-w-lg"
      onConfirm={async () => {
        const payload = changes();
        if (Object.keys(payload).length === 0) return;
        try {
          await updateCampaign(campaign.id, payload);
        } catch (e) {
          toast(errorMessage(e, t("saveFailed")), "error");
          throw e;
        }
        const policyChanged = "postEndAction" in payload || "postEndDestinationUrl" in payload || "postEndMessage" in payload;
        toast(campaign.status === "ENDED" && policyChanged ? t("savedEnded") : t("saved"), "success");
        onSaved();
      }}
    >
      <div className="space-y-5">
        <CampaignField label={tNew("nameLabel")} required htmlFor="campaign-settings-name">
          <Input id="campaign-settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={255} required />
        </CampaignField>
        {endEditable && (
          <CampaignField label={tNew("endLabel")} required htmlFor="campaign-settings-end">
            <Input
              id="campaign-settings-end"
              type="datetime-local"
              value={endsAtLocal}
              min={toLocalInput(new Date(floor))}
              onChange={(e) => setEndsAtLocal(e.target.value)}
              aria-invalid={periodInvalid || undefined}
              aria-describedby={periodInvalid ? "campaign-settings-end-error" : undefined}
              required
            />
            {periodInvalid && (
              <p id="campaign-settings-end-error" className="text-[12px] text-red-600 dark:text-red-400">
                {tErr("INVALID_CAMPAIGN_PERIOD")}
              </p>
            )}
          </CampaignField>
        )}
        <CampaignField label={tNew("defaultUrlLabel")} hint={t("defaultUrlHint")} htmlFor="campaign-settings-default-url">
          <Input
            id="campaign-settings-default-url"
            type="url"
            value={defaultUrl}
            onChange={(e) => setDefaultUrl(e.target.value)}
            placeholder="https://example.com/landing"
          />
        </CampaignField>
        <PostEndFields
          action={action}
          onAction={setAction}
          message={message}
          onMessage={setMessage}
          redirectUrl={redirectUrl}
          onRedirectUrl={setRedirectUrl}
        />
      </div>
    </ConfirmDialog>
  );
}
