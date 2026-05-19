"use client";

import { ArrowRight, CheckCircle2, Clock, Link2 } from "lucide-react";
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

/**
 * Three-tier visual hierarchy.
 *
 * <ol>
 *   <li><b>Primary</b> — the new short URL. Owns its own white row, mono semibold, full-bleed
 *       click target (the URL string itself is the {@code target="_blank"} anchor so we don't
 *       double-up with a separate "open" icon button).</li>
 *   <li><b>Secondary</b> — Copy / Share / QR action trio, kept on a single dedicated row so the
 *       three buttons share size + spacing instead of fighting for inline real estate with the
 *       URL. Copy stays the only filled (accent) button per the AGENTS.md "one primary CTA per
 *       card" rule; Share + QR are outline-tier siblings.</li>
 *   <li><b>Meta</b> — the original URL is prefixed by a {@code Link2} icon to anchor it as a
 *       "source" line instead of a floating text fragment, matching the Information-archetype
 *       inline-icon convention.</li>
 * </ol>
 *
 * The 24h-TTL strip stays as the last child (PR #229) but moves from translucent
 * {@code bg-white/70} to solid {@code bg-white} so it reads as a distinct CTA card on the
 * tinted parent surface instead of "fading out".
 */
export function ResultCard({ result, originalUrl, channel, authenticated }: Props) {
  const t = useTranslations("result");
  const { toast } = useToast();

  const expiresAt = authenticated
    ? null
    : new Date(Date.now() + ANONYMOUS_TTL_HOURS * 60 * 60 * 1000);

  return (
    <div className="animate-fade-in card-highlight relative overflow-hidden rounded-2xl border border-accent-200 bg-accent-50/40 p-5">
      {/* Decorative accent-glow in the top-right — pulls the eye to the new short URL row and
          breaks the otherwise-flat tinted rectangle. Pure CSS, no extra DOM cost on the LCP path. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent-200/40 blur-2xl"
      />
      <div className="relative mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-tagline text-accent-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("completed")}
        </div>
        {channel && (
          <span className="rounded-full border border-accent-200 bg-white/80 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent-700">
            {channel}
          </span>
        )}
      </div>

      <div className="relative space-y-3">
        {/* Tier 1 — primary: the new short URL. Rounded-xl + accent border-left bar pulls the row
            forward from the tinted parent surface; the URL itself stays the click target. */}
        <a
          href={result.shortUrl}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2 rounded-xl border border-slate-200 border-l-2 border-l-accent-500 bg-white px-3.5 py-3 transition hover:border-accent-300 hover:border-l-accent-600 hover:bg-accent-50/30"
          aria-label={t("open")}
        >
          <span className="min-w-0 flex-1 truncate font-mono text-[15px] font-semibold tracking-tight text-slate-900">
            {result.shortUrl}
          </span>
        </a>

        {/* Tier 2 — secondary: Copy (primary CTA) + Share + QR siblings on a single row */}
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
        </div>

        {/* Tier 3 — meta: anchored source row */}
        <div className="flex items-start gap-1.5 text-[12px] text-slate-500" title={originalUrl}>
          <Link2 className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-slate-400">{t("originalUrl")}</span>
            <span className="mx-1 text-slate-300">·</span>
            <span className="text-slate-600">{truncateMiddle(originalUrl, 72)}</span>
          </span>
        </div>

        {expiresAt && (
          <div className="rounded-md border border-accent-100 border-l-2 border-l-accent-500 bg-white px-3 py-2.5">
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
