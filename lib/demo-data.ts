import type {
  AsnClick,
  BotClick,
  BrowserClick,
  ChannelClick,
  CityClick,
  CountryClick,
  DailyClick,
  DestinationClick,
  DeviceClick,
  HeatmapCell,
  HourClick,
  LanguageClick,
  LinkStats,
  OsClick,
  ReferrerClick,
  ReferrerHostClick,
  RegionClick,
  SourceChannelClick,
  UtmCampaignClick,
  UtmContentClick,
  UtmMediumClick,
  UtmSourceClick,
  Velocity,
} from "@/types";

/**
 * Synthetic data for the public {@code /demo} page.
 *
 * Returns the full {@link LinkStats} shape — same payload the real {@code /stats/[code]} page
 * gets back from the backend — so the same {@code StatsBody} can render it without any
 * branching. The /demo page is a 100% mirror of the dashboard's stats view; only the data and
 * a thin "sample data" banner differ.
 *
 * Numbers are seeded so reloads stay stable (no jitter that would make the demo feel fake on
 * refresh).
 */

/** Anchor date — every relative window (last 30 days, etc.) builds backwards from here. */
const TODAY_UTC = new Date(Date.UTC(2026, 4, 10));

export function buildDemoLinkStats(): LinkStats {
  const daily = buildDaily(30);
  const human = daily.reduce((s, d) => s + d.count, 0);
  const bot = 184;
  const total = human + bot;
  const unique = Math.round(human * 0.62);
  const hourly = buildHourly(daily);
  const peakHour = hourly.reduce(
    (best, h) => (h.count > best.count ? h : best),
    hourly[0],
  ).hour;
  const velocity: Velocity = {
    currentHour: 28,
    baselinePerHour: 16,
    ratio: 1.74,
  };
  return {
    shortCode: "demo01",
    timezone: "Asia/Seoul",
    totalClicks: total,
    humanClicks: human,
    botClicks: bot,
    uniqueClicks: unique,
    previewClicks: 42,
    profileClicks: Math.round(human * 0.18),
    firstClickAt: new Date(TODAY_UTC.getTime() - 30 * 86_400_000).toISOString(),
    lastClickAt: new Date(TODAY_UTC.getTime() - 3 * 60_000).toISOString(),
    timeToFirstClickMinutes: 7,
    peakHour,
    velocity,
    returnRate: {
      newVisitors: Math.round(unique * 0.74),
      returningVisitors: Math.round(unique * 0.26),
      ratio: 0.26,
    },
    dailyClicks: daily,
    hourClicks: hourly,
    dayOfWeekClicks: buildDayOfWeek(daily),
    heatmap: buildHeatmap(),
    referrerClicks: buildReferrers(human),
    referrerHostClicks: buildReferrerHosts(human),
    channelClicks: buildChannels(human),
    deviceClicks: buildDevices(human),
    osClicks: buildOs(human),
    browserClicks: buildBrowsers(human),
    botClicks2: buildBots(bot),
    utmCampaignClicks: buildUtmCampaigns(human),
    utmSourceClicks: buildUtmSources(human),
    utmMediumClicks: buildUtmMediums(human),
    utmContentClicks: buildUtmContents(human),
    sourceChannelClicks: buildSourceChannels(human),
    destinationClicks: buildDestinations(human),
    countryClicks: buildCountries(human),
    regionClicks: buildRegions(human),
    cityClicks: buildCities(human),
    languageClicks: buildLanguages(human),
    asnClicks: buildAsns(human),
    datacenterClicks: 73,
  };
}

function buildDaily(days: number): DailyClick[] {
  const out: DailyClick[] = [];
  let seed = 0x9c7f3;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(TODAY_UTC.getTime() - i * 86_400_000);
    const dow = d.getUTCDay();
    const weekdayMultiplier = dow === 0 || dow === 6 ? 0.5 : dow === 5 ? 0.75 : 1;
    const drift = 1 + ((days - 1 - i) / days) * 0.6;
    const noise = 0.7 + rand() * 0.6;
    const base = 38 * weekdayMultiplier * drift * noise;
    out.push({ date: isoDate(d), count: Math.max(0, Math.round(base)) });
  }
  return out;
}

/**
 * Day-of-week labels matching the backend's {@code java.time.DayOfWeek} enum names. The real
 * LinkStats payload serializes those names directly ("MONDAY", "TUESDAY", …) and the Heatmap
 * component keys its render grid by them — emitting a numeric string here makes every cell
 * resolve to {@code undefined → 0 → bg-slate-50}, which is exactly the "히트맵 비어있잖아"
 * report from earlier /demo previews. Index 0 = MONDAY, matching ISO-8601 weekday ordering
 * and the {@code DAYS} constant in {@code components/charts/heatmap.tsx}.
 */
const DOW_LABELS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

function buildHeatmap(): HeatmapCell[] {
  const out: HeatmapCell[] = [];
  let seed = 0x4242;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  // Distribution targets a Korean creator audience: evening prime-time 19~23 dominates,
  // lunchtime 11~14 shows a secondary bump, dead-zone 02~06 stays sparse. Friday gets a small
  // weekend-eve boost; Saturday / Sunday lift the prime-time band slightly. The combined shape
  // gives the heatmap a visible "two horizontal stripes + weekend pop" pattern instead of a
  // flat noise field.
  for (let dow = 0; dow < 7; dow++) {
    const isWeekend = dow === 5 || dow === 6; // SATURDAY / SUNDAY (Mon-indexed)
    const isFriday = dow === 4;
    for (let hour = 0; hour < 24; hour++) {
      let weight: number;
      if (hour >= 19 && hour <= 23) {
        weight = isWeekend ? 9 : isFriday ? 7.5 : 6;
      } else if (hour >= 11 && hour <= 14) {
        weight = isWeekend ? 1.2 : 3;
      } else if (hour >= 2 && hour <= 6) {
        weight = 0.25;
      } else if (hour >= 7 && hour <= 10) {
        weight = isWeekend ? 0.9 : 1.4;
      } else if (hour >= 15 && hour <= 18) {
        weight = isWeekend ? 1.5 : 1.8;
      } else {
        weight = isWeekend ? 2 : 1.2;
      }
      const jitter = 0.75 + rand() * 0.5;
      const count = Math.max(0, Math.round(weight * jitter * 4));
      out.push({ dayOfWeek: DOW_LABELS[dow], hour, count });
    }
  }
  return out;
}

function buildHourly(daily: DailyClick[]): HourClick[] {
  // Mirror the same Korean prime-time shape as the heatmap so the Hour chart and the heatmap
  // tell the same story (peak around 20–22h).
  const total = daily.reduce((s, d) => s + d.count, 0);
  const weights: number[] = [];
  for (let h = 0; h < 24; h++) {
    if (h >= 19 && h <= 23) weights.push(9);
    else if (h >= 11 && h <= 14) weights.push(3);
    else if (h >= 2 && h <= 6) weights.push(0.4);
    else if (h >= 7 && h <= 10) weights.push(1.4);
    else if (h >= 15 && h <= 18) weights.push(1.8);
    else weights.push(1.2);
  }
  const sum = weights.reduce((s, w) => s + w, 0);
  return weights.map((w, h) => ({ hour: h, count: Math.round((w / sum) * total) }));
}

function buildDayOfWeek(daily: DailyClick[]): { dayOfWeek: string; count: number }[] {
  const sums = new Map<string, number>();
  for (const d of daily) {
    const day = new Date(d.date + "T00:00:00Z").getUTCDay();
    const label = DOW_LABELS[(day + 6) % 7]; // shift Sun=0 to Mon=0 indexing
    sums.set(label, (sums.get(label) ?? 0) + d.count);
  }
  return DOW_LABELS.map((label) => ({ dayOfWeek: label, count: sums.get(label) ?? 0 }));
}

function buildReferrers(total: number): ReferrerClick[] {
  return [
    { referrer: "https://instagram.com/haruatelier", count: Math.round(total * 0.31) },
    { referrer: "https://pf.kakao.com/_xharu", count: Math.round(total * 0.19) },
    { referrer: "https://haru.notion.site/spring-drop", count: Math.round(total * 0.12) },
    { referrer: "https://x.com/haruatelier/status/1234", count: Math.round(total * 0.08) },
    { referrer: "https://blog.naver.com/cafenoon", count: Math.round(total * 0.05) },
  ];
}

function buildReferrerHosts(total: number): ReferrerHostClick[] {
  return [
    { host: "instagram.com", count: Math.round(total * 0.34) },
    { host: "pf.kakao.com", count: Math.round(total * 0.21) },
    { host: "haru.notion.site", count: Math.round(total * 0.13) },
    { host: "x.com", count: Math.round(total * 0.09) },
    { host: "blog.naver.com", count: Math.round(total * 0.06) },
    { host: "(direct)", count: Math.round(total * 0.17) },
  ];
}

function buildChannels(total: number): ChannelClick[] {
  return [
    { channel: "social", count: Math.round(total * 0.42) },
    { channel: "messaging", count: Math.round(total * 0.21) },
    { channel: "search", count: Math.round(total * 0.12) },
    { channel: "direct", count: Math.round(total * 0.17) },
    { channel: "email", count: Math.round(total * 0.08) },
  ];
}

function buildDevices(total: number): DeviceClick[] {
  return [
    { device: "mobile", count: Math.round(total * 0.78) },
    { device: "desktop", count: Math.round(total * 0.18) },
    { device: "tablet", count: Math.round(total * 0.04) },
  ];
}

function buildOs(total: number): OsClick[] {
  return [
    { os: "iOS", count: Math.round(total * 0.51) },
    { os: "Android", count: Math.round(total * 0.27) },
    { os: "macOS", count: Math.round(total * 0.13) },
    { os: "Windows", count: Math.round(total * 0.07) },
    { os: "Linux", count: Math.round(total * 0.02) },
  ];
}

function buildBrowsers(total: number): BrowserClick[] {
  return [
    { browser: "Chrome", count: Math.round(total * 0.46) },
    { browser: "Safari", count: Math.round(total * 0.37) },
    { browser: "KakaoTalk WebView", count: Math.round(total * 0.09) },
    { browser: "Instagram WebView", count: Math.round(total * 0.05) },
    { browser: "Edge", count: Math.round(total * 0.03) },
  ];
}

function buildBots(total: number): BotClick[] {
  return [
    { bot: "KakaoTalk-Scrap", count: Math.round(total * 0.42) },
    { bot: "Twitterbot", count: Math.round(total * 0.18) },
    { bot: "Slackbot-LinkExpanding", count: Math.round(total * 0.14) },
    { bot: "Discordbot", count: Math.round(total * 0.09) },
    { bot: "facebookexternalhit", count: Math.round(total * 0.07) },
    { bot: "Googlebot", count: Math.round(total * 0.06) },
    { bot: "Bingbot", count: Math.round(total * 0.04) },
  ];
}

function buildUtmCampaigns(total: number): UtmCampaignClick[] {
  return [
    { campaign: "spring-drop", count: Math.round(total * 0.41) },
    { campaign: "weekend-sale", count: Math.round(total * 0.19) },
    { campaign: "bio-link", count: Math.round(total * 0.14) },
    { campaign: "newsletter-05", count: Math.round(total * 0.08) },
  ];
}

function buildUtmSources(total: number): UtmSourceClick[] {
  return [
    { source: "instagram", count: Math.round(total * 0.34) },
    { source: "kakao", count: Math.round(total * 0.21) },
    { source: "blog", count: Math.round(total * 0.18) },
    { source: "qr", count: Math.round(total * 0.12) },
    { source: "x", count: Math.round(total * 0.08) },
    { source: "email", count: Math.round(total * 0.07) },
  ];
}

function buildUtmMediums(total: number): UtmMediumClick[] {
  return [
    { medium: "social", count: Math.round(total * 0.46) },
    { medium: "messaging", count: Math.round(total * 0.21) },
    { medium: "qr", count: Math.round(total * 0.12) },
    { medium: "email", count: Math.round(total * 0.07) },
    { medium: "referral", count: Math.round(total * 0.14) },
  ];
}

function buildUtmContents(total: number): UtmContentClick[] {
  return [
    { content: "bio-link", count: Math.round(total * 0.34) },
    { content: "story-1", count: Math.round(total * 0.19) },
    { content: "reels-feature", count: Math.round(total * 0.12) },
    { content: "post-grid", count: Math.round(total * 0.08) },
  ];
}

function buildSourceChannels(total: number): SourceChannelClick[] {
  return [
    { source: "profile-bio", count: Math.round(total * 0.18) },
    { source: "profile-link", count: Math.round(total * 0.12) },
    { source: "qr-printed", count: Math.round(total * 0.07) },
  ];
}

function buildDestinations(total: number): DestinationClick[] {
  return [
    {
      destinationId: 1,
      url: "https://shop.haruatelier.com/spring-drop?variant=A",
      label: "variant-A",
      weight: 50,
      enabled: true,
      count: Math.round(total * 0.46),
    },
    {
      destinationId: 2,
      url: "https://shop.haruatelier.com/spring-drop?variant=B",
      label: "variant-B",
      weight: 50,
      enabled: true,
      count: Math.round(total * 0.54),
    },
  ];
}

function buildCountries(total: number): CountryClick[] {
  return [
    { country: "KR", count: Math.round(total * 0.61) },
    { country: "US", count: Math.round(total * 0.14) },
    { country: "JP", count: Math.round(total * 0.09) },
    { country: "SG", count: Math.round(total * 0.05) },
    { country: "DE", count: Math.round(total * 0.04) },
    { country: "GB", count: Math.round(total * 0.03) },
    { country: "VN", count: Math.round(total * 0.02) },
    { country: "FR", count: Math.round(total * 0.02) },
  ];
}

function buildRegions(total: number): RegionClick[] {
  return [
    { region: "Seoul", count: Math.round(total * 0.34) },
    { region: "Gyeonggi", count: Math.round(total * 0.18) },
    { region: "Busan", count: Math.round(total * 0.07) },
    { region: "California", count: Math.round(total * 0.06) },
    { region: "Tokyo", count: Math.round(total * 0.05) },
  ];
}

function buildCities(total: number): CityClick[] {
  return [
    { city: "Seoul", count: Math.round(total * 0.34) },
    { city: "Suwon", count: Math.round(total * 0.08) },
    { city: "Busan", count: Math.round(total * 0.07) },
    { city: "San Francisco", count: Math.round(total * 0.05) },
    { city: "Tokyo", count: Math.round(total * 0.05) },
    { city: "Singapore", count: Math.round(total * 0.04) },
  ];
}

function buildLanguages(total: number): LanguageClick[] {
  return [
    { language: "ko", count: Math.round(total * 0.64) },
    { language: "en", count: Math.round(total * 0.21) },
    { language: "ja", count: Math.round(total * 0.09) },
    { language: "zh", count: Math.round(total * 0.03) },
    { language: "de", count: Math.round(total * 0.02) },
  ];
}

function buildAsns(total: number): AsnClick[] {
  return [
    { asn: 4766, organization: "Korea Telecom", count: Math.round(total * 0.31) },
    { asn: 9318, organization: "SK Broadband", count: Math.round(total * 0.21) },
    { asn: 17858, organization: "LG U+", count: Math.round(total * 0.14) },
    { asn: 7018, organization: "AT&T", count: Math.round(total * 0.06) },
    { asn: 2516, organization: "KDDI", count: Math.round(total * 0.05) },
  ];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
