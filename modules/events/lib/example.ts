const DAY_MS = 86_400_000;

export function exampleEventTimes(locale: string) {
  const built = Date.parse(`${process.env.NEXT_PUBLIC_BUILD_DATE ?? ""}T10:00:00Z`);
  const now = Number.isNaN(built) ? Date.UTC(2026, 8, 28, 10) : built;
  const start = now + 9 * DAY_MS;
  return {
    now,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 2 * 3_600_000).toISOString(),
    timezone: locale === "ja" ? "Asia/Tokyo" : "Asia/Seoul",
  };
}
