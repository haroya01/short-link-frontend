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
  /** 속삭임 행(단축 답 줄 아래)용 텍스트 트리거 — 버튼 상자 없이 밑줄 글자만. */
  textTrigger?: boolean;
};

export function ShareButton({
  url,
  title = "kurl",
  text,
  variant = "ghost",
  size = "sm" as const,
  iconOnly = false,
  textTrigger = false,
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

  if (textTrigger) {
    return (
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        className="focus-ring rounded-sm text-slate-500 underline decoration-slate-300 decoration-1 underline-offset-[3px] transition-colors hover:text-slate-800 hover:decoration-slate-500 disabled:opacity-50 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-200"
      >
        {t("label")}
      </button>
    );
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
