import { dateLocale } from "@/lib/date";

/** 목록 행의 짧은 시간 — 스레드·X처럼 "방금 · 30분 · 2시간 · 3일"(en 30m, ja 30分), 일주일이 넘으면 날짜. */
export function compactTime(iso: string, locale: string, justNow: string, now: number = Date.now()): string {
  const tag = dateLocale(locale);
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return justNow;
  // ja 의 narrow 는 "30m" 이라 short("30 分")에서 공백을 뺀다.
  const japanese = tag.startsWith("ja");
  const unit = (value: number, name: "minute" | "hour" | "day") => {
    const text = new Intl.NumberFormat(tag, {
      style: "unit",
      unit: name,
      unitDisplay: japanese ? "short" : "narrow",
    }).format(value);
    return japanese ? text.replace(/\s/g, "") : text;
  };
  if (seconds < 3600) return unit(Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return unit(Math.floor(seconds / 3600), "hour");
  if (seconds < 604_800) return unit(Math.floor(seconds / 86_400), "day");
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(
    tag,
    sameYear ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" },
  );
}
