// Preview-only stub for @/lib/api/stats. KurlLinkCard self-fetches its public
// stats by short code; the preview/design runtime has no backend. Returning
// realistic sample stats for one code (and rejecting others) lets the REAL
// KurlLinkCard render BOTH its "ok" dashboard and its "fallback" plain-link state
// — no reimplementation. Mapped in via .design-sync/tsconfig.json paths.
const dailyClicks = [4, 7, 12, 9, 18, 24, 31, 28, 22, 35, 42, 38, 51, 47, 60, 55, 68, 72, 65, 80, 74, 88, 92, 97].map(
  (count, i) => ({ date: `2026-05-${String(i + 1).padStart(2, "0")}`, count }),
);

export async function getPublicLinkStats(shortCode: string) {
  // Only "spring" is opted into public stats; every other code → fallback (plain link).
  if (shortCode !== "spring") throw new Error("not opted into public stats");
  return {
    shortCode,
    timezone: "Asia/Seoul",
    totalClicks: 3847,
    humanClicks: 3712,
    botClicks: 135,
    uniqueClicks: 2904,
    countryClicks: [
      { country: "KR", count: 2346 },
      { country: "US", count: 801 },
      { country: "JP", count: 700 },
    ],
    deviceClicks: [
      { device: "mobile", count: 2847 },
      { device: "desktop", count: 1000 },
    ],
    dailyClicks,
  } as unknown as import("@/types/stats").LinkStats;
}
