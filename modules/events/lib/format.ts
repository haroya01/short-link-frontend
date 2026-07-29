const SHORT_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://kurl.me";

export function shortUrlOf(code: string): string {
  return `${SHORT_BASE}/${code}`;
}

/** 이벤트 자체 타임존으로 표시 — 뷰어 로컬이 아니라 "모임이 열리는 곳"의 시간이 기준. */
export function formatEventDate(iso: string, timezone: string, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: safeZone(timezone),
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).formatToParts(new Date(iso));
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const withoutWeekday = parts
    .filter((p) => p.type !== "weekday")
    .map((p) => p.value)
    .join("")
    .replace(/[\s,]+$/, "")
    .trim();
  // ko/ja 관례 — "8월 5일 (수)" / "8月5日(水)". Intl ko 는 괄호를 안 붙인다.
  if (!weekday) return withoutWeekday;
  if (locale.startsWith("ja")) return `${withoutWeekday}(${weekday})`;
  return `${withoutWeekday} (${weekday})`;
}

export function formatEventTime(iso: string, timezone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: safeZone(timezone),
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatEventRange(
  startsAt: string,
  endsAt: string | null,
  timezone: string,
  locale: string,
): string {
  const date = formatEventDate(startsAt, timezone, locale);
  const start = formatEventTime(startsAt, timezone, locale);
  if (!endsAt) return `${date} · ${start}`;
  const sameDay =
    formatEventDate(startsAt, timezone, locale) === formatEventDate(endsAt, timezone, locale);
  const end = sameDay
    ? formatEventTime(endsAt, timezone, locale)
    : `${formatEventDate(endsAt, timezone, locale)} ${formatEventTime(endsAt, timezone, locale)}`;
  return `${date} · ${start} – ${end}`;
}

/** datetime-local 입력값(주최자 타임존 벽시계) ↔ ISO 변환. */
export function wallTimeToIso(local: string, timezone: string): string {
  const [datePart, timePart] = local.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = zoneOffsetMs(new Date(utcGuess), safeZone(timezone));
  return new Date(utcGuess - offset).toISOString();
}

export function isoToWallTime(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeZone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/** 확인 화면의 "캘린더에 추가" — .ics 없이 링크만으로 되는 Google Calendar 템플릿 URL. */
export function googleCalendarUrl(event: {
  title: string;
  startsAt: string;
  endsAt: string | null;
  locationText: string | null;
  onlineUrl: string | null;
}): string {
  const basic = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const endIso =
    event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 2 * 3600_000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${basic(event.startsAt)}/${basic(endIso)}`,
  });
  const location = event.locationText ?? event.onlineUrl;
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function safeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return "Asia/Seoul";
  }
}
