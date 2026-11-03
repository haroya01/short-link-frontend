/** 이벤트 자체 타임존으로 표시 — 뷰어 로컬이 아니라 "모임이 열리는 곳"의 시간이 기준. */
function formatEventDate(iso: string, timezone: string, locale: string): string {
  const date = new Date(iso);
  const timeZone = safeZone(timezone);
  const day = new Intl.DateTimeFormat(locale, { timeZone, year: "numeric", month: "long", day: "numeric" }).format(date);
  const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" }).format(date);
  // ko/ja 관례 — "8월 5일 (수)" / "8月5日(水)". Intl ko 는 괄호를 안 붙인다.
  if (locale.startsWith("ja")) return `${day}(${weekday})`;
  return `${day} (${weekday})`;
}

export type DayPeriods = { am: string; pm: string };

export type EventWhenText = { day: string; time: string; zone: string };

function formatEventTime(iso: string, timezone: string, locale: string, dayPeriods?: DayPeriods): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: safeZone(timezone),
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(date);
  if (!dayPeriods) return parts.map((part) => part.value).join("");
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: safeZone(timezone), hour: "numeric", hourCycle: "h23" }).format(date),
  );
  return parts
    .map((part) => (part.type === "dayPeriod" ? (hour < 12 ? dayPeriods.am : dayPeriods.pm) : part.value))
    .join("");
}

export function formatEventRange(
  startsAt: string,
  endsAt: string | null,
  timezone: string,
  locale: string,
  dayPeriods?: DayPeriods,
): string {
  const date = formatEventDate(startsAt, timezone, locale);
  const start = formatEventTime(startsAt, timezone, locale, dayPeriods);
  if (!endsAt) return `${date} · ${start}`;
  const sameDay =
    formatEventDate(startsAt, timezone, locale) === formatEventDate(endsAt, timezone, locale);
  const end = sameDay
    ? formatEventTime(endsAt, timezone, locale, dayPeriods)
    : `${formatEventDate(endsAt, timezone, locale)} ${formatEventTime(endsAt, timezone, locale, dayPeriods)}`;
  const sep = locale.startsWith("ja") ? "〜" : " – ";
  return `${date} · ${start}${sep}${end}`;
}

export function eventWhenText(
  event: { startsAt: string; endsAt: string | null; timezone: string },
  locale: string,
  dayPeriods: DayPeriods,
): EventWhenText {
  const { startsAt, endsAt, timezone } = event;
  const zone = timezoneLabel(timezone, locale);
  const startDay = formatEventDate(startsAt, timezone, locale);
  const start = formatEventTime(startsAt, timezone, locale, dayPeriods);
  const ja = locale.startsWith("ja");
  if (!endsAt) return { day: startDay, time: start, zone };
  const endDay = formatEventDate(endsAt, timezone, locale);
  const end = formatEventTime(endsAt, timezone, locale, dayPeriods);
  if (endDay === startDay) return { day: startDay, time: `${start}${ja ? "〜" : " – "}${end}`, zone };
  return { day: `${startDay} ${start}${ja ? "〜" : " –"}`, time: `${endDay} ${end}`, zone };
}

/** "(Asia/Tokyo)" 같은 IANA id 대신 "일본 시간"/"日本時間" 류의 로케일 라벨. 실패 시 도시명 폴백. */
function timezoneLabel(timezone: string, locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: safeZone(timezone),
      timeZoneName: "shortGeneric",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name && !/^GMT/.test(name)) return name;
    if (name) return name;
  } catch {
    /* fall through */
  }
  return timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
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

function safeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return "Asia/Seoul";
  }
}
