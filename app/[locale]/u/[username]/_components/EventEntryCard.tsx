"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ChevronDown, MapPin } from "lucide-react";
import type { EventConfig } from "@/types";
import {
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from "@/lib/calendar-export";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  id: number;
  /** Backend-validated JSON. */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Visitor-facing event card with "Add to Calendar" dropdown. Three options:
 * <ul>
 *   <li>Google Calendar (opens prefilled compose page in a new tab)</li>
 *   <li>Outlook (same idea, web compose)</li>
 *   <li>Apple / iCal — triggers a {@code .ics} file download; macOS/iOS open it directly, Windows
 *       opens a "Add to calendar?" picker.</li>
 * </ul>
 *
 * <p>The date tile on the left renders the start time in the <i>host's</i> timezone (the offset
 * stored on the backend), not the visitor's local time. The author meant "9 AM KST" so we show
 * "9 AM KST" — converting silently would surprise people who scheduled across timezones.
 */
export function EventEntryCard({ id, content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.event");
  const locale = useLocale();
  const config = useMemo(() => parseConfig(content), [content]);
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

  const gcalHref = googleCalendarUrl(config) ?? undefined;
  const outlookHref = outlookCalendarUrl(config) ?? undefined;

  return (
    <li className="profile-fade" style={fadeStyle}>
      <div className={`profile-card-static px-4 py-4 ${colors.card} ${colors.cardBorder}`}>
        <div className="flex items-start gap-3">
          <div
            className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-accent-200/60 bg-accent-50/70 text-center leading-tight"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent-700">
                {dateBadge.month}
              </p>
              <p className="text-xl font-bold leading-none text-accent-900">
                {dateBadge.day}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold leading-tight ${colors.primary}`}>
              {config.title}
            </p>
            <p className={`mt-0.5 text-[12px] ${colors.muted}`}>{timeLabel}</p>
            {config.location && (
              <p
                className={`mt-1 inline-flex items-center gap-1 text-[11px] ${colors.muted}`}
              >
                <MapPin className="h-2.5 w-2.5" />
                <span className="truncate">{config.location}</span>
              </p>
            )}
            {config.description && (
              <p className={`mt-1.5 line-clamp-3 text-[12px] leading-snug ${colors.muted}`}>
                {config.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[12px] font-medium ${colors.cardBorder} bg-white/70 ${colors.primary}`}
            >
              <Calendar className="h-3 w-3" />
              {t("addToCalendar")}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-lg"
              >
                {gcalHref && (
                  <a
                    href={gcalHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    {t("google")}
                  </a>
                )}
                {outlookHref && (
                  <a
                    href={outlookHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50"
                  >
                    {t("outlook")}
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    downloadIcs(config, `event-${id}.ics`, `event-${id}@kurl.me`);
                    setMenuOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
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
              className={`text-[12px] underline-offset-2 hover:underline ${colors.primary}`}
            >
              {t("moreInfo")}
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function parseConfig(raw: string): (CalendarEvent & EventConfig) | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.title !== "string" || typeof parsed?.startsAt !== "string") return null;
    return {
      title: parsed.title,
      startsAt: parsed.startsAt,
      endsAt: typeof parsed.endsAt === "string" ? parsed.endsAt : null,
      location: typeof parsed.location === "string" ? parsed.location : null,
      description: typeof parsed.description === "string" ? parsed.description : null,
      url: typeof parsed.url === "string" ? parsed.url : null,
    };
  } catch {
    return null;
  }
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
