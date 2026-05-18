"use client";

import { ExternalLink, CheckCircle2, ArrowRight, Clock } from "lucide-react";
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
   * When false (anonymous shortener path), the card surfaces the 24h auto-expiry policy plus a
   * signup CTA. Backend enforces {@code ANONYMOUS_TTL = Duration.ofDays(1)} so this mirrors the
   * server-side rule rather than re-deriving it. Authenticated shortens never auto-expire
   * (unless the user picked their own {@code expiresAt}) so we skip the strip entirely.
   */
  authenticated: boolean;
};

const ANONYMOUS_TTL_HOURS = 24;

export function ResultCard({ result, originalUrl, channel, authenticated }: Props) {
  const t = useTranslations("result");
  const { toast } = useToast();

  const expiresAt = authenticated
    ? null
    : new Date(Date.now() + ANONYMOUS_TTL_HOURS * 60 * 60 * 1000);

  return (
    <div className="animate-fade-in rounded-lg border border-accent-200 bg-accent-50/40 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-accent-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("completed")}
        </div>
        {channel && (
          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-700">
            {channel}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            href={result.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="block min-w-0 truncate font-mono text-sm font-semibold text-slate-900 hover:underline"
          >
            {result.shortUrl}
          </a>
          <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
            <CopyButton
              size="sm"
              variant="accent"
              label={t("copy")}
              value={result.shortUrl}
              onCopied={() => toast(t("copied"), "success")}
            />
            <ShareButton url={result.shortUrl} title={result.shortUrl} iconOnly />
            <QrButton url={result.shortUrl} />
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("open")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <p className="truncate text-xs text-slate-600" title={originalUrl}>
          {t("originalUrl")}: {truncateMiddle(originalUrl, 80)}
        </p>

        {expiresAt && (
          <div className="rounded-md border-l-2 border-accent-500 bg-white/70 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-700" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[13px] font-medium text-slate-900">
                  {t("anonymousExpiryTitle")}
                </p>
                <p className="font-mono text-[11px] text-slate-500">
                  {t("anonymousExpiryAt", { when: formatExpiry(expiresAt) })}
                </p>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-1 text-[12px] font-medium text-accent-700 hover:text-accent-800"
                >
                  {t("anonymousExpirySignup")}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Render {@code expiresAt} in the user's local time using their browser locale + 24-hour clock.
 * Falls back to ISO if {@link Intl.DateTimeFormat} can't resolve a useful format (e.g. ancient
 * runtimes / unknown locale). The format intentionally drops seconds — the TTL precision is hours,
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
