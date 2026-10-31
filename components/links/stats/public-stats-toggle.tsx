"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { setLinkVisibility } from "@/lib/api";
import { useLinkDetail, useSetLinkDetail } from "@/lib/api/links.queries";
import { useApiErrorMessage } from "@/lib/error-messages";

export type PublicStatsState = {
  isPublic: boolean | null;
  busy: boolean;
  toggle: () => Promise<void>;
  copyPublicUrl: () => Promise<void>;
};

export function usePublicStats(shortCode: string | null): PublicStatsState {
  const t = useTranslations("publicStats");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const { data: detail } = useLinkDetail(shortCode);
  const setDetail = useSetLinkDetail();
  const [busy, setBusy] = useState(false);
  const isPublic = detail ? Boolean(detail.statsPublic) : null;

  async function toggle() {
    if (!shortCode || busy || isPublic === null) return;
    setBusy(true);
    try {
      const res = await setLinkVisibility(shortCode, !isPublic);
      setDetail(shortCode, { statsPublic: res.statsPublic });
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyPublicUrl() {
    if (!shortCode) return;
    const url = `${window.location.origin}/${locale}/stats/${shortCode}/public`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t("shareCopied"), "success");
    } catch {
      toast(t("shareCopyFailed"), "error");
    }
  }

  return { isPublic, busy, toggle, copyPublicUrl };
}

export function PublicStatsToggle({ state, className }: { state: PublicStatsState; className?: string }) {
  const t = useTranslations("publicStats");
  const labelId = useId();
  const { isPublic, busy, toggle, copyPublicUrl } = state;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex items-center gap-2">
        <span id={labelId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("switchLabel")}
        </span>
        <Switch
          checked={isPublic === true}
          aria-labelledby={labelId}
          disabled={busy || isPublic === null}
          onClick={() => void toggle()}
        />
      </span>
      {isPublic === true && (
        <Button variant="ghost" size="sm" onClick={() => void copyPublicUrl()}>
          {t("shareButton")}
        </Button>
      )}
    </div>
  );
}
