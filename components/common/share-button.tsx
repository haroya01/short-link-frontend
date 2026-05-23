"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = {
  url: string;
  title?: string;
  text?: string;
  variant?: "default" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
};

export function ShareButton({
  url,
  title = "kurl",
  text,
  variant = "ghost",
  size = "sm" as const,
  iconOnly = false,
}: Props) {
  const t = useTranslations("share");
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(url);
      toast(t("copiedFallback"), "success");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={busy}
      aria-label={t("label")}
    >
      <Share2 className="h-3.5 w-3.5" />
      {!iconOnly && <span>{t("label")}</span>}
    </Button>
  );
}
