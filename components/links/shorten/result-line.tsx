"use client";

import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { QrButton } from "@/components/links/qr/button";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { truncateMiddle } from "@/lib/utils";
import type { CreateLinkResponse } from "@/types";

type Props = {
  result: CreateLinkResponse;
  originalUrl: string;
  authenticated: boolean;
  /** 영수증 스택에서 몇 번째 줄인가 — 등장 계단(70ms)의 기준. */
  enterIndex?: number;
};

/** 속삭임 행의 텍스트 링크 문법 — 본문 링크 밑줄(§10)과 같은 결. */
const WHISPER_LINK =
  "focus-ring rounded-sm text-slate-500 underline decoration-slate-300 decoration-1 underline-offset-[3px] transition-colors hover:text-slate-800 hover:decoration-slate-500 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-200";

/**
 * 단축의 답 — 카드가 아니라 줄. 입력했던 밑줄 자리에 짧은 주소가 초록으로 내려앉고(밑줄이
 * 왼→오로 그어지며 남는다), 버튼은 복사 하나. 원본·통계·QR·공유·열기는 밑줄 아래 속삭임 한 줄.
 * 연속 단축은 이 줄이 영수증처럼 아래로 쌓인다(enterIndex 계단).
 */
export function ResultLine({ result, originalUrl, authenticated, enterIndex = 0 }: Props) {
  const t = useTranslations("result");
  const { toast } = useToast();
  const display = result.shortUrl.replace(/^https?:\/\//, "");

  return (
    <div
      data-testid="result-line"
      className="result-enter"
      style={{ ["--idx" as string]: enterIndex } as React.CSSProperties}
    >
      <div className="relative flex items-end gap-4 pb-2.5">
        <a
          href={result.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="focus-ring min-w-0 flex-1 rounded-sm"
        >
          <span
            className="result-beat block truncate font-mono text-[21px] font-bold tracking-tight text-accent-700 dark:text-accent-400 sm:text-[24px]"
            style={{ ["--beat" as string]: 0 } as React.CSSProperties}
          >
            {display}
          </span>
        </a>
        <CopyButton
          size="sm"
          variant="accent"
          label={t("copy")}
          value={result.shortUrl}
          onCopied={() => toast(t("copied"), "success")}
        />
        {/* 답의 밑줄 — 입력 줄과 같은 자리 문법인데, 이번엔 초록이 그어진 채로 남는다. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-accent-600 [animation-delay:220ms] motion-safe:animate-[result-underline-draw_420ms_var(--ease)_both] motion-reduce:scale-x-100 dark:bg-accent-500"
        />
      </div>

      <div
        className="result-beat mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] text-slate-400 dark:text-slate-500"
        style={{ ["--beat" as string]: 1 } as React.CSSProperties}
      >
        <span className="min-w-0 max-w-full truncate sm:max-w-[44ch]" title={originalUrl}>
          {truncateMiddle(originalUrl, 48)}
        </span>
        {authenticated && (
          <Link href={`/stats/${result.shortCode}`} className={WHISPER_LINK}>
            {t("stats")}
          </Link>
        )}
        <QrButton url={result.shortUrl} textTrigger />
        <ShareButton url={result.shortUrl} title={result.shortUrl} textTrigger />
        <a href={result.shortUrl} target="_blank" rel="noreferrer" className={WHISPER_LINK}>
          {t("open")}
        </a>
        {!authenticated && (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            {t("anonymousExpiryInline")}
            <Link
              href="/login"
              className="focus-ring rounded-sm font-medium text-accent-700 underline decoration-accent-300 decoration-1 underline-offset-[3px] transition-colors hover:text-accent-800 dark:text-accent-400 dark:decoration-accent-700 dark:hover:text-accent-300"
            >
              {t("anonymousExpirySignup")}
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
