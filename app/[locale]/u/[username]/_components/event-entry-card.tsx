"use client";

import { useMemo, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock, MapPin } from "lucide-react";
import type { EventConfig } from "@/types";
import { AddToCalendarMenu } from "@/modules/profile/components/add-to-calendar-menu";
import { parseEventConfig } from "@/modules/profile/lib/block-config-parsers";
import { offsetToIana } from "@/modules/profile/lib/event-date";
import { eventWhenText, type DayPeriods } from "@/modules/events/lib/format";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  id: number;
  /** Backend-validated JSON. */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
  /** 주인이 대표로 올린 모집 — 목록 맨 위, 강조색 테두리와 '대표' 라벨. */
  featured?: boolean;
};

/**
 * Visitor-facing event card with "Add to Calendar" dropdown. The visual hierarchy:
 *
 * <ol>
 *   <li>Relative-time pill ("3일 후" / "오늘" / "종료됨") at the top — instantly tells the visitor
 *       whether this is something they can still attend.</li>
 *   <li>Calendar-leaf date tile on the left with a colored band on top — date is the strongest
 *       single signal for an event, so it gets its own 80px tile rather than competing inline.</li>
 *   <li>Title + time + location stacked with icons — each row a single piece of information.</li>
 *   <li>Full-width "Add to Calendar" CTA at the bottom using {@link ThemeColors#ctaPrimary} so
 *       the card matches the rest of the profile's button voice. Splits into Google / Outlook /
 *       Apple ICS on tap.</li>
 * </ol>
 *
 * <p>Past events render dimmed with the CTA replaced by a "종료됨" badge — visitors can't usefully
 * add a past event to their calendar.
 *
 * <p>The date tile + time render in the <i>host's</i> timezone (offset stored on the backend),
 * not the visitor's local time. The author meant "9 AM KST" so we show "9 AM KST" — converting
 * silently would surprise people who scheduled across timezones.
 */
export function EventEntryCard({ id, content, colors, fadeStyle, featured = false }: Props) {
  const t = useTranslations("publicProfile.event");
  const tProfile = useTranslations("publicProfile");
  const locale = useLocale();
  const config = useMemo(() => parseEventConfig(content), [content]);
  if (!config) return null;

  const start = new Date(config.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const offsetMatch = config.startsAt.match(/([+\-]\d{2}:?\d{2}|Z)$/);
  const hostOffset = offsetMatch ? offsetMatch[1] : null;

  const dateBadge = formatDateBadge(start, hostOffset, locale);
  const timeLabel = formatTimeLabel(config, locale, { am: t("am"), pm: t("pm") });
  const relative = formatRelativeTime(start, t);
  const isPast = start.getTime() < Date.now();

  return (
    <li className="profile-fade" style={fadeStyle}>
      {/* No overflow-hidden on the card — the "Add to Calendar" dropdown is positioned
          absolute below the button and was getting clipped by the card's bounds when the
          card itself was overflow-hidden. The date tile keeps its own overflow-hidden for
          the colored month band; the outer card doesn't need to clip anything. */}
      <div
        className={`profile-card-static ${colors.card} ${featured ? colors.accentBorder : colors.cardBorder} ${
          isPast ? "opacity-60" : ""
        }`}
      >
        {featured && (
          <p className={`px-4 pt-3.5 text-[12px] font-medium ${colors.accentText}`}>{tProfile("featuredPick")}</p>
        )}
        <div className={`flex items-start gap-4 px-4 ${featured ? "pt-2.5" : "pt-4"}`}>
          {/* Calendar-leaf date tile. Colored band on top, big day numeral on bottom. */}
          <div className="grid h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white text-center leading-none">
            <div className={`grid h-6 place-items-center px-1 ${colors.avatar}`}>
              <p className={`text-[10px] font-bold ${colors.avatarText}`}>
                {dateBadge.month}
              </p>
            </div>
            <div className="grid place-items-center px-1">
              <p className="text-3xl font-bold text-slate-900">{dateBadge.day}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {relative && (
              <p className={`text-[12px] font-medium ${isPast ? colors.muted : colors.accentText}`}>{relative}</p>
            )}
            {/* Past events mute the title too (not just opacity-60 on the card) so the "ended"
                state reads as a deliberate muted-text treatment rather than a disabled-looking
                dim — matches the muted relative-time label and the "종료" CTA badge below. */}
            <p
              className={`mt-1 text-base font-semibold leading-tight ${
                isPast ? colors.muted : colors.primary
              }`}
            >
              {config.title}
            </p>
            <p
              className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${colors.muted}`}
            >
              <Clock className="h-3 w-3 shrink-0" />
              <span>{timeLabel}</span>
            </p>
            {config.location && (
              <p
                className={`mt-1 flex items-start gap-1.5 text-[12px] ${colors.muted}`}
              >
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="truncate">{config.location}</span>
              </p>
            )}
            {config.description && (
              <p className={`mt-2 line-clamp-3 text-[12px] leading-snug ${colors.muted}`}>
                {config.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 px-4 pb-4">
          {isPast ? (
            <div
              className={`flex h-10 w-full items-center justify-center rounded-lg border px-3 text-[12px] font-medium ${colors.cardBorder} ${colors.muted}`}
            >
              {t("eventEnded")}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <AddToCalendarMenu
                  event={config}
                  uid={`event-${id}@kurl.me`}
                  filename={`event-${id}.ics`}
                  label={t("addToCalendar")}
                  labels={{ google: t("google"), outlook: t("outlook"), ics: t("appleIcs") }}
                  tone="light"
                  className={`group inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-medium active:scale-[0.98] ${colors.ctaPrimary}`}
                />
              </div>
              {config.url && (
                <a
                  href={config.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex h-10 shrink-0 items-center rounded-lg border px-3 text-[12px] font-medium ${colors.cardBorder} ${colors.primary} hover:underline`}
                >
                  {t("moreInfo")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function formatDateBadge(
  start: Date,
  offset: string | null,
  locale: string,
): { month: string; day: string } {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      ...(offset ? { timeZone: offsetToIana(offset) } : {}),
    });
    const parts = formatter.formatToParts(start);
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    return { month, day };
  } catch {
    return {
      month: start.toLocaleString(locale, { month: "short" }),
      day: String(start.getDate()),
    };
  }
}

function formatTimeLabel(config: EventConfig, locale: string, dayPeriods: DayPeriods): string {
  const offset = config.startsAt.match(/([+\-]\d{2}:?\d{2}|Z)$/)?.[1] ?? null;
  const timezone = offset ? offsetToIana(offset) : "UTC";
  const when = eventWhenText({ startsAt: config.startsAt, endsAt: config.endsAt ?? null, timezone }, locale, dayPeriods);
  const crossesDays = /[–〜]$/.test(when.day);
  return `${crossesDays ? `${when.day} ${when.time}` : when.time} (${when.zone})`;
}

/**
 * Coarse-grained relative-time pill: 종료됨 / 오늘 / 내일 / N일 후 / N주 후 / 곧.
 * Falls back to {@code null} when no translation key matches so the pill simply doesn't render —
 * the absolute date + time below already carries the timing info.
 */
function formatRelativeTime(
  start: Date,
  t: ReturnType<typeof useTranslations<"publicProfile.event">>,
): string | null {
  const now = Date.now();
  const ms = start.getTime() - now;
  if (ms < 0) {
    return t("ended");
  }
  const day = 24 * 60 * 60 * 1000;
  const dayDiff = Math.floor(ms / day);
  if (dayDiff === 0) return t("today");
  if (dayDiff === 1) return t("tomorrow");
  if (dayDiff < 7) return t("inDays", { days: dayDiff });
  const weekDiff = Math.floor(dayDiff / 7);
  if (weekDiff < 5) return t("inWeeks", { weeks: weekDiff });
  return null;
}
