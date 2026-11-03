/** Same window as the backend's EXPIRING_SOON filter and the overview's expiringLinks count. */
const EXPIRING_SOON_MS = 3 * 86_400_000;

export type LinkExpiry =
  | { kind: "expired" }
  | { kind: "soon"; days: number }
  | { kind: "later"; days: number };

function calendarDay(ms: number, timeZone: string): number {
  let day: string;
  try {
    day = new Intl.DateTimeFormat("en-CA", { timeZone }).format(ms);
  } catch {
    day = new Date(ms).toISOString().slice(0, 10);
  }
  return Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

export function linkExpiry(
  expiresAt: string | null | undefined,
  { now = Date.now(), timezone = "Asia/Seoul" }: { now?: number; timezone?: string } = {},
): LinkExpiry | null {
  if (!expiresAt) return null;
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return null;
  if (expires < now) return { kind: "expired" };
  const days = calendarDay(expires, timezone) - calendarDay(now, timezone);
  return expires - now < EXPIRING_SOON_MS ? { kind: "soon", days } : { kind: "later", days };
}
