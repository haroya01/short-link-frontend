"use client";

import { useState } from "react";
import { Globe, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setLinkVisibility } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/error-messages";

export function PublicStatsToggle({ shortCode }: { shortCode: string }) {
  const t = useTranslations("publicStats");
  const locale = useLocale();
  const { toast } = useToast();
  const errorMessage = useApiErrorMessage();
  const [busy, setBusy] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const next = isPublic === null ? true : !isPublic;
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
      toast("copy failed", "error");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={toggle} disabled={busy}>
        {isPublic === true ? (
          <>
            <Lock className="h-3.5 w-3.5" /> {t("togglePrivate")}
          </>
        ) : (
          <>
            <Globe className="h-3.5 w-3.5" /> {t("togglePublic")}
          </>
        )}
      </Button>
      {isPublic === true && (
        <Button variant="ghost" size="sm" onClick={copyPublicUrl}>
          {t("shareButton")}
        </Button>
      )}
    </div>
  );
}
