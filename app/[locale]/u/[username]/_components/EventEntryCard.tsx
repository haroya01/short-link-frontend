"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, CalendarPlus, ChevronDown, Clock, MapPin } from "lucide-react";
import type { EventConfig } from "@/types";
import {
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
} from "@/lib/calendar-export";
import { parseEventConfig } from "@/lib/block-config-parsers";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  id: number;
  /** Backend-validated JSON. */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
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
export function EventEntryCard({ id, content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.event");
  const locale = useLocale();
  const config = useMemo(() => parseEventConfig(content), [content]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!config) return null;

  const start = new Date(config.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const offsetMatch = config.startsAt.match(/([+\-]\d{2}:?\d{2}|Z)$/);
  const hostOffset = offsetMatch ? offsetMatch[1] : null;

  const dateBadge = formatDateBadge(start, hostOffset, locale);
  const timeLabel = formatTimeLabel(config, locale);
  const relative = formatRelativeTime(start, t);
  const isPast = start.getTime() < Date.now();

  const gcalHref = googleCalendarUrl(config) ?? undefined;
  const outlookHref = outlookCalendarUrl(config) ?? undefined;

  return (
    <li className="profile-fade" style={fadeStyle}>
      <div
        className={`profile-card-static overflow-hidden ${colors.card} ${colors.cardBorder} ${
          isPast ? "opacity-60" : ""
        }`}
      >
        <div className="flex items-start gap-4 px-4 pt-4">
          {/* Calendar-leaf date tile. Colored band on top, big day numeral on bottom. */}
          <div className="grid h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-accent-200/60 bg-white text-center leading-none shadow-sm">
            <div className="grid h-6 place-items-center bg-accent-600 px-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white">
                {dateBadge.month}
              </p>
            </div>
            <div className="grid place-items-center px-1">
              <p className="text-3xl font-bold text-slate-900">{dateBadge.day}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {relative && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isPast
                    ? "bg-slate-100 text-slate-500"
                    : "bg-accent-100 text-accent-800"
                }`}
              >
                {relative}
              </span>
            )}
            <p className={`mt-1 text-base font-semibold leading-tight ${colors.primary}`}>
              {config.title}
            </p>
            <p
              className={`mt-1.5 inline-flex items-center gap-1.5 text-[12px] ${colors.muted}`}
            >
              <Clock className="h-3 w-3 shrink-0" />
              <span>{timeLabel}</span>
            </p>
            {config.location && (
              <p
                className={`mt-1 inline-flex items-start gap-1.5 text-[12px] ${colors.muted}`}
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
              className={`flex w-full items-center justify-center rounded-md border px-3 py-2 text-[12px] font-medium ${colors.cardBorder} ${colors.muted}`}
            >
              {t("eventEnded")}
            </div>
          ) : (
            <div className="flex items-center gap-2" ref={menuRef}>
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className={`group inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium ${colors.ctaPrimary}`}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {t("addToCalendar")}
                  <ChevronDown
                    className={`h-3.5 w-3.5 opacity-70 transition-transform ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-lg"
                  >
                    {gcalHref && (
                      <a
                        href={gcalHref}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                      >
                        <Calendar className="h-3 w-3" />
                        {t("google")}
                      </a>
                    )}
                    {outlookHref && (
                      <a
                        href={outlookHref}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                      >
                        <Calendar className="h-3 w-3" />
                        {t("outlook")}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        downloadIcs(config, `event-${id}.ics`, `event-${id}@kurl.me`);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <Calendar className="h-3 w-3" />
                      {t("appleIcs")}
                    </button>
                  </div>
                )}
              </div>
              {config.url && (
                <a
                  href={config.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`shrink-0 rounded-md border px-3 py-2 text-[12px] font-medium ${colors.cardBorder} ${colors.primary} hover:underline`}
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

function formatTimeLabel(config: EventConfig, locale: string): string {
  const start = new Date(config.startsAt);
  const offsetMatch = config.startsAt.match(/([+\-]\d{2}:?\d{2}|Z)$/);
  const offset = offsetMatch ? offsetMatch[1] : null;
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  };
  if (offset) {
    try {
      opts.timeZone = offsetToIana(offset);
      opts.timeZoneName = "short";
    } catch {
      /* fall through to plain format */
    }
  }
  return new Intl.DateTimeFormat(locale, opts).format(start);
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

/**
 * Intl's {@code timeZone} option only accepts IANA names, not raw offsets like {@code +09:00}.
 * We map common offsets to "UTC" suffixed names that all browsers support. For exotic offsets
 * we fall back to Etc/GMT (sign-inverted per POSIX convention).
 */
function offsetToIana(offset: string): string {
  if (offset === "Z" || offset === "+00:00") return "UTC";
  const m = offset.match(/^([+\-])(\d{2}):?(\d{2})$/);
  if (!m) return "UTC";
  const sign = m[1] === "+" ? "-" : "+"; // Etc/GMT is sign-inverted
  const hours = parseInt(m[2], 10);
  const minutes = parseInt(m[3], 10);
  if (minutes !== 0) {
    // Half-hour zones (e.g. India +05:30) — fall back to UTC; we can revisit if it matters.
    return "UTC";
  }
  return `Etc/GMT${sign}${hours}`;
}
