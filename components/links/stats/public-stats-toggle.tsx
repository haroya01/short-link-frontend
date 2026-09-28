"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { getLinkDetail, setLinkVisibility } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";

export function PublicStatsToggle({ shortCode, className }: { shortCode: string; className?: string }) {
  const t = useTranslations("publicStats");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const labelId = useId();

  useEffect(() => {
    let active = true;
    setIsPublic(null);
    getLinkDetail(shortCode)
      .then((detail) => active && setIsPublic(Boolean(detail.statsPublic)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [shortCode]);

  async function toggle() {
    if (busy || isPublic === null) return;
    setBusy(true);
    try {
      const next = !isPublic;
      const res = await setLinkVisibility(shortCode, next);
      setIsPublic(res.statsPublic);
    } catch (err) {
      toast(errorMessage(err, t("toggleFailed")), "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyPublicUrl() {
    const url =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}/${locale}/stats/${shortCode}/public`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t("shareCopied"), "success");
    } catch {
      toast(t("shareCopyFailed"), "error");
    }
  }

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
        <Button variant="ghost" size="sm" onClick={copyPublicUrl}>
          {t("shareButton")}
        </Button>
      )}
    </div>
  );
}
