/**
 * Calendar export helpers — turn an EVENT block into either an ICS file (RFC 5545 minimal subset)
 * or a deep-link URL that opens the event in Google Calendar / Outlook's web compose. Pure
 * functions so they're easy to unit-test and so the public profile renders without round-tripping.
 *
 * <p>Timezones: the backend stores ISO 8601 with offset. For ICS DTSTART we emit a UTC instant
 * ({@code 20260615T050000Z}) — every calendar app understands that, no VTIMEZONE block needed,
 * and the original local time is preserved through the UTC conversion. The visible label in our
 * own UI keeps the original offset so the host's intended time shows correctly.
 */

export type CalendarEvent = {
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  url: string | null;
};

/** Default duration when {@code endsAt} is missing — picks a "reasonable workshop length". */
const DEFAULT_DURATION_MIN = 60;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Date → {@code 20260615T050000Z} (RFC 5545 form). Input must already be UTC. */
function toIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escapes per RFC 5545 §3.3.11 — commas, semicolons, backslashes, and newlines. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Resolved start + computed/explicit end as Date objects. */
function resolveTimes(ev: CalendarEvent): { start: Date; end: Date } | null {
  const start = new Date(ev.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  let end: Date;
  if (ev.endsAt) {
    end = new Date(ev.endsAt);
    if (Number.isNaN(end.getTime())) return null;
  } else {
    end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
  }
  return { start, end };
}

/**
 * Generates an RFC 5545 .ics body. UTF-8, CRLF line endings. Suitable for {@code Blob} download.
 * Returns null when the event's timestamps are unparseable — callers should disable the action.
 */
export function buildIcs(ev: CalendarEvent, uid?: string): string | null {
  const times = resolveTimes(ev);
  if (!times) return null;
  const now = new Date();
  // Stable-ish UID: caller can pass a block id so re-downloads "update" the same event in clients
  // that key by UID. Falls back to a timestamped one so multiple anonymous downloads don't merge.
  const finalUid = uid ?? `${now.getTime()}@kurl.me`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//kurl.me//profile event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${finalUid}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(times.start)}`,
    `DTEND:${toIcsUtc(times.end)}`,
    `SUMMARY:${escapeIcsText(ev.title)}`,
  ];
  if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/**
 * Builds the Google Calendar "add event" URL — opens the compose page pre-filled. Returns null
 * when timestamps are unparseable.
 */
export function googleCalendarUrl(ev: CalendarEvent): string | null {
  const times = resolveTimes(ev);
  if (!times) return null;
  const dates = `${toIcsUtc(times.start)}/${toIcsUtc(times.end)}`.replace(/[-:]/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates,
  });
  if (ev.location) params.set("location", ev.location);
  const details = [ev.description, ev.url].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook web "deeplink" — works for both personal and 365 accounts via outlook.live.com. */
export function outlookCalendarUrl(ev: CalendarEvent): string | null {
  const times = resolveTimes(ev);
  if (!times) return null;
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    startdt: times.start.toISOString(),
    enddt: times.end.toISOString(),
  });
  if (ev.location) params.set("location", ev.location);
  const body = [ev.description, ev.url].filter(Boolean).join("\n\n");
  if (body) params.set("body", body);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/** Triggers a download of the ICS blob — caller should pass a memo-friendly filename. */
export function downloadIcs(ev: CalendarEvent, filename: string, uid?: string): boolean {
  const body = buildIcs(ev, uid);
  if (!body) return false;
  if (typeof window === "undefined") return false;
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  return true;
}
