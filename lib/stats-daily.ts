import type { DailyClick } from "@/types";

/** Build calendar-day buckets from the API's sparse (only days with clicks) series. */
export function fillDailyClicks(
  daily: DailyClick[],
  { days = 30, timezone = "Asia/Seoul", now = new Date() }: {
    days?: number;
    timezone?: string;
    now?: Date;
  } = {},
): DailyClick[] {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  // Calendar arithmetic in UTC avoids skipping/repeating dates at DST boundaries; the end day
  // above still comes from the report timezone, rather than the browser's local timezone.
  const end = Date.UTC(value("year"), value("month") - 1, value("day"));
  const counts = new Map(daily.map((point) => [point.date, point.count]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end - (days - index - 1) * 86_400_000).toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });
}

export function fillDailySince(
  daily: DailyClick[],
  { from, timezone = "Asia/Seoul", now = new Date() }: { from: Date; timezone?: string; now?: Date },
): DailyClick[] {
  const day = (instant: Date) => Date.parse(`${new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(instant)}T00:00:00Z`);
  const last = daily.reduce((max, point) => Math.max(max, Date.parse(`${point.date}T00:00:00Z`)), day(now));
  const days = Math.max(1, Math.round((last - day(from)) / 86_400_000) + 1);
  return fillDailyClicks(daily, { days, timezone: "UTC", now: new Date(last) });
}
