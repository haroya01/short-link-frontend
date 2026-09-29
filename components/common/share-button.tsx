"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Props = {
  url: string;
  title?: string;
  text?: string;
  variant?: "default" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  /** 속삭임 행(단축 답 줄 아래)용 텍스트 트리거 — 버튼 상자 없이 밑줄 글자만. */
  textTrigger?: boolean;
  className?: string;
};

/**
 * The OS share sheet, and nothing else: where the browser has none, this renders hidden
 * (html[data-share] from the pre-paint script) because the copy button beside it already covers it.
 */

export function ShareButton({
  url,
  title = "kurl",
  text,
  variant = "ghost",
  size = "sm" as const,
  iconOnly = false,
  textTrigger = false,
  className,
}: Props) {
  const t = useTranslations("share");
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    if (busy || typeof navigator.share !== "function") return;
    setBusy(true);
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Dismissing the sheet rejects too; there is nothing to report either way.
    } finally {
      setBusy(false);
    }
  }

  if (textTrigger) {
    return (
      <button
        type="button"
        data-share-only
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
      data-share-only
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={busy}
      aria-label={iconOnly ? t("label") : undefined}
      className={className}
    >
      <Share2 aria-hidden className="h-3.5 w-3.5" />
      {!iconOnly && <span>{t("label")}</span>}
    </Button>
  );
}
