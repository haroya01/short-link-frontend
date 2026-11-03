"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { ShareButton } from "@/components/common/share-button";
import { QrButton } from "@/components/links/qr/button";
import { Link } from "@/i18n/navigation";
import { SignInLink } from "@/components/auth/sign-in-link";
import { LiveClicks } from "@/components/links/shorten/live-clicks";
import { truncateMiddle } from "@/lib/utils";
import type { CreateLinkResponse } from "@/types";

type Props = {
  result: CreateLinkResponse;
  originalUrl: string;
  authenticated: boolean;
  passwordRequested?: boolean;
  /** 영수증 스택에서 몇 번째 줄인가 — 등장 계단(70ms)의 기준. */
  enterIndex?: number;
};

/** 속삭임 행의 텍스트 링크 문법 — 본문 링크 밑줄(§10)과 같은 결. */
const WHISPER_LINK =
  "focus-ring rounded-sm text-slate-500 underline decoration-slate-300 decoration-1 underline-offset-[3px] transition-colors hover:text-slate-800 hover:decoration-slate-500 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-200";

/**
 * 단축의 답 — 카드가 아니라 줄. 초록 밑줄이 왼→오로 그어지고, 그 끝이 지나간 자리부터 붙여 넣은 긴
 * 주소가 짧은 주소로 바뀐다. 버튼은 복사 하나. 원본·통계·QR·공유는 밑줄 아래 속삭임 한 줄.
 * 연속 단축은 이 줄이 영수증처럼 아래로 쌓인다(enterIndex 계단).
 */
export function ResultLine({
  result,
  originalUrl,
  authenticated,
  passwordRequested = false,
  enterIndex = 0,
}: Props) {
  const t = useTranslations("result");
  const display = result.shortUrl.replace(/^https?:\/\//, "");
  const [passes, setPasses] = useState(0);

  return (
    <div
      data-testid="result-line"
      style={{ ["--sweep-at" as string]: `${enterIndex * 70 + 60}ms` } as React.CSSProperties}
    >
      <div className="relative">
        <span
          aria-hidden
          data-testid="result-sweep-out"
          className="sweep-out pointer-events-none absolute inset-x-0 bottom-0 flex items-end pb-3"
        >
          <span className="truncate font-mono text-[16px] font-medium text-slate-400 dark:text-slate-500">
            {originalUrl}
          </span>
        </span>
        <div data-testid="result-sweep-in" className="sweep-in relative flex items-end gap-4 pb-2.5">
          <a
            href={result.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring min-w-0 flex-1 rounded-sm"
          >
            <span className="block truncate font-mono text-[21px] font-bold tracking-tight text-accent-700 dark:text-accent-400 sm:text-[24px]">
              {display}
            </span>
          </a>
          <CopyButton size="sm" label={t("copy")} value={result.shortUrl} />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-accent-600 dark:bg-accent-500" />
        </div>
        {passes > 0 && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-full">
            <span key={passes} data-testid="click-pass" className="line-pass block h-full w-2/5" />
          </span>
        )}
      </div>

      <div
        className="sweep-after mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400"
        style={{ ["--after" as string]: "300ms" } as React.CSSProperties}
      >
        <span className="min-w-0 max-w-full truncate sm:max-w-[44ch]" title={originalUrl}>
          {truncateMiddle(originalUrl, 48)}
        </span>
        {result.passwordProtected ? (
          <span className="inline-flex items-center gap-1 font-medium text-slate-900 dark:text-slate-100">
            <Lock aria-hidden className="h-3.5 w-3.5" />
            {t("passwordProtected")}
          </span>
        ) : (
          passwordRequested && (
            <span role="status" className="font-medium text-red-600 dark:text-red-400">
              {t("passwordNotApplied")}
            </span>
          )
        )}
        {authenticated && (
          <Link href={`/stats/${result.shortCode}`} className={WHISPER_LINK}>
            {t("stats")}
          </Link>
        )}
        <QrButton url={result.shortUrl} textTrigger />
        <ShareButton url={result.shortUrl} title={result.shortUrl} textTrigger />
        {!authenticated && (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            {t("anonymousExpiryInline")}
            <SignInLink
              reason="stats"
              next="/dashboard"
              className="focus-ring rounded-sm font-medium text-slate-900 underline decoration-slate-300 decoration-1 underline-offset-[3px] transition-colors hover:decoration-slate-900 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-100"
            >
              {t("anonymousExpirySignup")}
            </SignInLink>
          </span>
        )}
      </div>

      {!authenticated && result.claimToken && (
        <div className="sweep-after mt-3" style={{ ["--after" as string]: "380ms" } as React.CSSProperties}>
          <LiveClicks
            shortCode={result.shortCode}
            claimToken={result.claimToken}
            onTick={() => setPasses((n) => n + 1)}
          />
        </div>
      )}
    </div>
  );
}
