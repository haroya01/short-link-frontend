import { dateLocale } from "@/lib/date";

/** Absolute publish instant for a scheduled row — the author needs the exact date·time, not "in 3
 *  days". Pinned to Asia/Seoul (the app's canonical publish clock) so server and client agree and it
 *  doesn't drift with the reader's device timezone. */
export function scheduledLabel(iso: string, locale: string): string {
  const when = new Date(iso);
  // Show the year only when it isn't this year — a post scheduled for next January reading as just
  // "Jan 3" would be ambiguous, but carrying the year on every near-term row is noise.
  const showYear = when.getFullYear() !== new Date().getFullYear();
  return when.toLocaleString(dateLocale(locale), {
    ...(showYear ? { year: "numeric" } : {}),
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}
