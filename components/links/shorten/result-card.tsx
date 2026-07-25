"use client";

import { ArrowRight, BarChart3, ExternalLink, IdCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "@/components/common/copy-button";
import { QrButton } from "@/components/links/qr/button";
import { ShareButton } from "@/components/common/share-button";
import { buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Link } from "@/i18n/navigation";
import { truncateMiddle } from "@/lib/utils";
import type { CreateLinkResponse } from "@/types";

type Props = {
  result: CreateLinkResponse;
  originalUrl: string;
  /**
   * When false (anonymous shortener path), the card surfaces the 24h auto-expiry strip plus a
   * signup CTA. Backend enforces {@code ANONYMOUS_TTL = Duration.ofDays(1)} so this mirrors the
   * server-side rule rather than re-deriving it. Authenticated shortens never auto-expire (unless
   * the user picked their own {@code expiresAt}) so we skip the strip entirely.
   */
  authenticated: boolean;
  /** 같은 배치에서 몇 번째 카드인가 — 등장 계단(70ms)과 안쪽 박자의 기준. */
  enterIndex?: number;
};

const ANONYMOUS_TTL_HOURS = 24;

export function ResultCard({ result, originalUrl, authenticated, enterIndex = 0 }: Props) {
  const t = useTranslations("result");
  const { toast } = useToast();

  const expiresAt = authenticated
    ? null
    : new Date(Date.now() + ANONYMOUS_TTL_HOURS * 60 * 60 * 1000);

  return (
    <div
      data-testid="result-card"
      className="result-enter rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5"
      style={{ ["--idx" as string]: enterIndex } as React.CSSProperties}
    >
      <div className="space-y-4">
        <div
          className="result-beat flex flex-wrap items-center justify-between gap-2"
          style={{ ["--beat" as string]: 0 } as React.CSSProperties}
        >
          <div>
            <p className="text-[11px] font-semibold text-accent-700 dark:text-accent-400">
              {t("completed")}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("nextStepHint")}</p>
          </div>
          {authenticated && (
            <Link
              href={`/stats/${result.shortCode}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {t("viewStats")}
            </Link>
          )}
        </div>

        <a
          href={result.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="result-beat block min-w-0"
          style={{ ["--beat" as string]: 1 } as React.CSSProperties}
          aria-label={t("open")}
        >
          {/* 주소가 이 카드의 주인공 — 자리에 앉으면 밑에 초록이 왼→오로 그어진다(형광 긋기 문법).
              inline-block이라 밑줄 폭이 컨테이너가 아니라 주소 글자 폭을 따른다. */}
          <span className="result-underline inline-block max-w-full truncate align-top font-mono text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
            {result.shortUrl}
          </span>
        </a>

        <div
          className="result-beat flex flex-wrap items-center gap-1.5"
          style={{ ["--beat" as string]: 2 } as React.CSSProperties}
        >
          <CopyButton
            size="sm"
            variant="accent"
            label={t("copy")}
            value={result.shortUrl}
            onCopied={() => toast(t("copied"), "success")}
          />
          <a
            href={result.shortUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("open")}
          </a>
          <ShareButton url={result.shortUrl} title={result.shortUrl} variant="outline" />
          <QrButton url={result.shortUrl} />
        </div>
      </div>

      <div
        className="result-beat"
        style={{ ["--beat" as string]: 3 } as React.CSSProperties}
      >
      <div className="my-4 h-px bg-slate-100 dark:bg-slate-800" aria-hidden />

      <div className="space-y-2 text-[12px]">
        <p className="min-w-0 truncate text-slate-500 dark:text-slate-400" title={originalUrl}>
          <span className="text-slate-400 dark:text-slate-500">{t("originalUrl")}</span>
          <span className="mx-1 text-slate-300">·</span>
          <span className="text-slate-600 dark:text-slate-300">{truncateMiddle(originalUrl, 56)}</span>
        </p>

        {authenticated && (
          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <Link
              href={`/stats/${result.shortCode}`}
              className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 px-3 py-2.5 text-left hover:border-slate-300 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              <span className="min-w-0">
                <span className="block text-[12px] font-medium text-slate-900 dark:text-slate-100">
                  {t("statsCta")}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {t("statsCtaDesc")}
                </span>
              </span>
              <BarChart3 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 transition group-hover:text-accent-700" />
            </Link>
            <Link
              href="/settings/profile"
              className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 px-3 py-2.5 text-left hover:border-slate-300 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              <span className="min-w-0">
                <span className="block text-[12px] font-medium text-slate-900 dark:text-slate-100">
                  {t("profileCta")}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {t("profileCtaDesc")}
                </span>
              </span>
              <IdCard className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400 transition group-hover:text-accent-700" />
            </Link>
          </div>
        )}

        {expiresAt && (
          <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
            <span
              className="text-slate-500 dark:text-slate-400"
              title={t("anonymousExpiryAt", { when: formatExpiry(expiresAt) })}
            >
              {t("anonymousExpiryInline")}
            </span>
            <Link
              href="/login"
              className="group inline-flex shrink-0 items-center gap-1 font-medium text-accent-700 dark:text-accent-400 hover:text-accent-800"
            >
              {t("anonymousExpirySignup")}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/**
 * Render {@code expiresAt} in the user's local time using their browser locale + 24-hour clock.
 * Falls back to ISO if {@link Intl.DateTimeFormat} can't resolve a useful format (e.g. ancient
 * runtimes / unknown locale). Seconds intentionally dropped — the TTL precision is hours, so
 * showing :ss would imply more precision than the backend guarantees.
 */
function formatExpiry(date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
