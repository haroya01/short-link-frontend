"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { CopyButton } from "./copy-button";
import { QrButton } from "./qr-button";
import { ShareButton } from "./share-button";
import { useToast } from "./ui/toast";
import { Link } from "@/i18n/navigation";
import { truncateMiddle } from "@/lib/utils";
import type { CreateLinkResponse } from "@/types";

type Props = {
  result: CreateLinkResponse;
  originalUrl: string;
  channel?: string;
  /**
   * When false (anonymous shortener path), the card surfaces the 24h auto-expiry strip plus a
   * signup CTA. Backend enforces {@code ANONYMOUS_TTL = Duration.ofDays(1)} so this mirrors the
   * server-side rule rather than re-deriving it. Authenticated shortens never auto-expire (unless
   * the user picked their own {@code expiresAt}) so we skip the strip entirely.
   */
  authenticated: boolean;
};

const ANONYMOUS_TTL_HOURS = 24;

/**
 * Success-confirmation card. Three rows: URL, actions, footer meta. Nothing else. Earlier passes
 * tried to also prove the "analytics" half of the hero promise here with a live SSE counter, but
 * the result card's job is to confirm and get out of the way — Apple confirmation surfaces never
 * pile on feature demos. The analytics proof now lives entirely up-funnel (hero subhead + features
 * carousel preview) and down-funnel (/stats page). The card itself stays bare.
 */
export function ResultCard({ result, originalUrl, channel, authenticated }: Props) {
  const t = useTranslations("result");
  const { toast } = useToast();

  const expiresAt = authenticated
    ? null
    : new Date(Date.now() + ANONYMOUS_TTL_HOURS * 60 * 60 * 1000);

  return (
    <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="space-y-4">
        <a
          href={result.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="block min-w-0"
          aria-label={t("open")}
        >
          <span className="block truncate font-mono text-[15px] font-semibold tracking-tight text-slate-900 sm:text-base">
            {result.shortUrl}
          </span>
        </a>

        <div className="flex flex-wrap items-center gap-1.5">
          <CopyButton
            size="sm"
            variant="accent"
            label={t("copy")}
            value={result.shortUrl}
            onCopied={() => toast(t("copied"), "success")}
          />
          <ShareButton url={result.shortUrl} title={result.shortUrl} variant="outline" />
          <QrButton url={result.shortUrl} />
          {channel && (
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-slate-400">
              {channel}
            </span>
          )}
        </div>
      </div>

      <div className="my-4 h-px bg-slate-100" aria-hidden />

      <div className="space-y-2 text-[12px]">
        <p className="min-w-0 truncate text-slate-500" title={originalUrl}>
          <span className="text-slate-400">{t("originalUrl")}</span>
          <span className="mx-1 text-slate-300">·</span>
          <span className="text-slate-600">{truncateMiddle(originalUrl, 56)}</span>
        </p>

        {expiresAt && (
          <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
            <span
              className="text-slate-500"
              title={t("anonymousExpiryAt", { when: formatExpiry(expiresAt) })}
            >
              {t("anonymousExpiryInline")}
            </span>
            <Link
              href="/login"
              className="group inline-flex shrink-0 items-center gap-1 font-medium text-accent-700 hover:text-accent-800"
            >
              {t("anonymousExpirySignup")}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
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
