"use client";

import { useMemo, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays, ArrowRight, ExternalLink } from "lucide-react";
import type { BookingConfig } from "@/types";
import { parseBookingConfig } from "@/lib/block-config-parsers";
import { resolveBookingProvider } from "@/components/profile-section/booking-providers";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  /** Backend-validated JSON ({@code {url, title?, description?, ctaLabel?}}). */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Visitor-facing "예약하기" card for the BOOKING block. Calmer than a hero link — calendar icon
 * + title + description + a single CTA opening the provider in a new tab. The provider name
 * (Calendly / 네이버예약 etc.) shows as a small badge so visitors know what they're about to open.
 *
 * <p>Render shape is intentionally close to the email form / contact card aesthetic so a profile
 * with multiple "actiony" blocks reads as a cohesive column instead of mismatched cards.
 */
export function BookingEntryCard({ content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.booking");
  const config = useMemo(() => parseBookingConfig(content), [content]);
  const provider = useMemo(() => resolveBookingProvider(config.url), [config.url]);

  if (!config.url) return null;

  const title = config.title ?? t("defaultTitle");
  const ctaLabel = config.ctaLabel ?? t("defaultCta");

  return (
    <li className="profile-fade" style={fadeStyle}>
      <a
        href={config.url}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(10);
            } catch {
              /* ignore */
            }
          }
        }}
        className={`profile-card group block overflow-hidden ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
      >
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.cardBorder} border bg-white/70`}
          >
            <CalendarDays className={`h-4 w-4 ${colors.primary}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold leading-tight ${colors.primary}`}>{title}</p>
            {config.description && (
              <p className={`mt-1 line-clamp-2 text-[12px] leading-snug ${colors.muted}`}>
                {config.description}
              </p>
            )}
            {provider && (
              <p
                className={`mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium ${colors.muted}`}
              >
                <ExternalLink className="h-2.5 w-2.5" />
                {provider.name}
              </p>
            )}
          </div>
        </div>
        <div
          className={`flex items-center justify-between border-t px-4 py-2.5 ${colors.cardBorder}`}
        >
          <span className={`text-[13px] font-medium ${colors.primary}`}>{ctaLabel}</span>
          <ArrowRight
            className={`h-3.5 w-3.5 transition group-hover:translate-x-0.5 ${colors.primary}`}
          />
        </div>
      </a>
    </li>
  );
}

