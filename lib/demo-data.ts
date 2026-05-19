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
  // Mix of link-unfurlers (the bulk for a Korean creator: KakaoTalk-Scrap dominates) plus the
  // SEO/crawler tail you'd actually see on a public link (Googlebot, Bingbot, Yeti, SemrushBot,
  // AhrefsBot). Numbers are seeded percentages of the bot bucket; the long tail intentionally
  // includes single-digit entries so the BreakdownList shows the "lots of small ones" pattern
  // that mirrors a real link's bots section.
  return [
    { bot: "KakaoTalk-Scrap", count: Math.round(total * 0.34) },
    { bot: "Twitterbot", count: Math.round(total * 0.15) },
    { bot: "Slackbot-LinkExpanding", count: Math.round(total * 0.11) },
    { bot: "Discordbot", count: Math.round(total * 0.08) },
    { bot: "facebookexternalhit", count: Math.round(total * 0.07) },
    { bot: "Googlebot", count: Math.round(total * 0.06) },
    { bot: "Yeti (NaverBot)", count: Math.round(total * 0.05) },
    { bot: "Bingbot", count: Math.round(total * 0.04) },
    { bot: "SemrushBot", count: Math.round(total * 0.03) },
    { bot: "AhrefsBot", count: Math.round(total * 0.03) },
    { bot: "LinkedInBot", count: Math.round(total * 0.02) },
    { bot: "Applebot", count: Math.round(total * 0.02) },
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
  // KR dominates (~60% of human clicks via countryClicks). Spread it across the realistic
  // top-N administrative regions so the BreakdownList shows a "Seoul + Gyeonggi own half, the
  // rest is a long tail of metros" pattern instead of a 3-row stub. Tail mixes JP/US/EU/SEA
  // regions so the section reads as a real audience map, not a Korea-only one.
  return [
    { region: "Seoul", count: Math.round(total * 0.27) },
    { region: "Gyeonggi", count: Math.round(total * 0.16) },
    { region: "Busan", count: Math.round(total * 0.06) },
    { region: "Incheon", count: Math.round(total * 0.04) },
    { region: "Daegu", count: Math.round(total * 0.03) },
    { region: "Daejeon", count: Math.round(total * 0.02) },
    { region: "Gwangju", count: Math.round(total * 0.015) },
    { region: "Ulsan", count: Math.round(total * 0.01) },
    { region: "Jeju", count: Math.round(total * 0.008) },
    { region: "California", count: Math.round(total * 0.05) },
    { region: "New York", count: Math.round(total * 0.025) },
    { region: "Washington", count: Math.round(total * 0.015) },
    { region: "Tokyo", count: Math.round(total * 0.05) },
    { region: "Osaka", count: Math.round(total * 0.02) },
    { region: "Singapore", count: Math.round(total * 0.04) },
    { region: "England", count: Math.round(total * 0.02) },
    { region: "Berlin", count: Math.round(total * 0.015) },
    { region: "Île-de-France", count: Math.round(total * 0.012) },
    { region: "Ho Chi Minh", count: Math.round(total * 0.01) },
  ];
}

function buildCities(total: number): CityClick[] {
  // City-level breakdown — finer than regions, but the BreakdownList truncates at top 10 so the
  // ones below the cut are kept for total-share accuracy. KR cities split Seoul/Bundang/Pangyo
  // (typical creator-audience metros) and include Suwon/Busan/Daegu to anchor the long tail.
  return [
    { city: "Seoul", count: Math.round(total * 0.24) },
    { city: "Bundang", count: Math.round(total * 0.05) },
    { city: "Pangyo", count: Math.round(total * 0.04) },
    { city: "Suwon", count: Math.round(total * 0.04) },
    { city: "Goyang", count: Math.round(total * 0.025) },
    { city: "Yongin", count: Math.round(total * 0.02) },
    { city: "Busan", count: Math.round(total * 0.05) },
    { city: "Incheon", count: Math.round(total * 0.03) },
    { city: "Daegu", count: Math.round(total * 0.025) },
    { city: "Daejeon", count: Math.round(total * 0.015) },
    { city: "Gwangju", count: Math.round(total * 0.012) },
    { city: "Jeju", count: Math.round(total * 0.008) },
    { city: "Tokyo", count: Math.round(total * 0.04) },
    { city: "Osaka", count: Math.round(total * 0.018) },
    { city: "San Francisco", count: Math.round(total * 0.035) },
    { city: "New York", count: Math.round(total * 0.022) },
    { city: "Seattle", count: Math.round(total * 0.014) },
    { city: "Singapore", count: Math.round(total * 0.035) },
    { city: "London", count: Math.round(total * 0.018) },
    { city: "Berlin", count: Math.round(total * 0.014) },
    { city: "Paris", count: Math.round(total * 0.012) },
    { city: "Ho Chi Minh City", count: Math.round(total * 0.01) },
  ];
}

function buildLanguages(total: number): LanguageClick[] {
  // Accept-Language first item. Korean dominant, English long-tail (US + UK), then JP/CN/TW/EU.
  // Includes a small "es" + "fr" entry so the locale section shows depth.
  return [
    { language: "ko", count: Math.round(total * 0.58) },
    { language: "en-US", count: Math.round(total * 0.14) },
    { language: "en-GB", count: Math.round(total * 0.04) },
    { language: "ja", count: Math.round(total * 0.08) },
    { language: "zh-CN", count: Math.round(total * 0.03) },
    { language: "zh-TW", count: Math.round(total * 0.015) },
    { language: "de", count: Math.round(total * 0.02) },
    { language: "fr", count: Math.round(total * 0.015) },
    { language: "es", count: Math.round(total * 0.01) },
    { language: "vi", count: Math.round(total * 0.01) },
  ];
}

function buildAsns(total: number): AsnClick[] {
  // KR ISP tier (KT / SKB / LG U+) makes up the bulk — these are the consumer ISPs that own
  // residential / mobile traffic in Korea. International tail covers cloud-egress (Cloudflare,
  // Akamai) which on a real link mean either VPN users or scraping/preview fetches, plus US/JP
  // consumer ISPs (Comcast, KDDI, NTT). datacenterClicks (separate field on LinkStats) shows up
  // in the section description, so this list is purely the per-org breakdown.
  return [
    { asn: 4766, organization: "Korea Telecom (KT)", count: Math.round(total * 0.26) },
    { asn: 9318, organization: "SK Broadband", count: Math.round(total * 0.18) },
    { asn: 17858, organization: "LG U+", count: Math.round(total * 0.12) },
    { asn: 45996, organization: "SK Telecom Mobile", count: Math.round(total * 0.07) },
    { asn: 38099, organization: "KT Mobile", count: Math.round(total * 0.05) },
    { asn: 7018, organization: "AT&T", count: Math.round(total * 0.04) },
    { asn: 7922, organization: "Comcast", count: Math.round(total * 0.025) },
    { asn: 2516, organization: "KDDI", count: Math.round(total * 0.035) },
    { asn: 4713, organization: "NTT Communications", count: Math.round(total * 0.02) },
    { asn: 13335, organization: "Cloudflare", count: Math.round(total * 0.025) },
    { asn: 16509, organization: "Amazon AWS", count: Math.round(total * 0.018) },
    { asn: 15169, organization: "Google", count: Math.round(total * 0.014) },
    { asn: 20940, organization: "Akamai", count: Math.round(total * 0.012) },
    { asn: 3320, organization: "Deutsche Telekom", count: Math.round(total * 0.01) },
  ];
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
