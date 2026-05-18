import type {
  CountryClick,
  DailyClick,
  HeatmapCell,
  UtmSourceClick,
} from "@/types";

/**
 * Synthetic data for the public /demo page. Shapes match the real LinkStats payload so the same
 * presentation components can render it directly. Numbers are seeded so reloads stay stable.
 */

const TODAY_UTC = new Date(Date.UTC(2026, 4, 10));

export type DemoShareChannel = "x" | "kakao" | "slack" | "instagram" | "direct";

export type DemoSharedLink = {
  /** Short slug shown under the kurl.me/ host. */
  slug: string;
  /** OG title surfaced on the unfurl card. */
  ogTitle: string;
  /** OG description — second line of the unfurl. */
  ogDescription: string;
  /** Source host displayed under the title (e.g. "open.spotify.com"). */
  host: string;
  /** Where the visitor shared it. Drives the channel badge + colored dot. */
  channel: DemoShareChannel;
  /** Click count rendered with a ping pulse. */
  clicks: number;
  /** Hot links (>= baseline) animate the ping; cold ones stay static. */
  hot: boolean;
};

export type DemoProfileLink = {
  /** Visible label on the link row. */
  label: string;
  /** Host shown under the label (truncated). */
  host: string;
  /** 4-archetype shape so the silhouette telegraphs surface variety. */
  shape: "highlight" | "link" | "embed" | "place" | "contact";
};

export type DemoProfile = {
  handle: string;
  displayName: string;
  tagline: string;
  links: DemoProfileLink[];
};

export type DemoStats = {
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  uniqueClicks: number;
  timeToFirstClickMinutes: number;
  velocityRatio: number;
  dailyClicks: DailyClick[];
  heatmap: HeatmapCell[];
  utmSourceClicks: UtmSourceClick[];
  countryClicks: CountryClick[];
  /** Cards rendered by the viral / share-card preview section. */
  sharedLinks: DemoSharedLink[];
  /** Silhouette data for the public-profile preview section. */
  profile: DemoProfile;
};

export function buildDemoStats(): DemoStats {
  const daily = buildDaily(30);
  const total = daily.reduce((s, d) => s + d.count, 0);
  return {
    totalClicks: total + 184,
    humanClicks: total,
    botClicks: 184,
    uniqueClicks: Math.round(total * 0.62),
    timeToFirstClickMinutes: 7,
    velocityRatio: 1.74,
    dailyClicks: daily,
    heatmap: buildHeatmap(),
    utmSourceClicks: [
      { source: "instagram", count: Math.round(total * 0.34) },
      { source: "kakao", count: Math.round(total * 0.21) },
      { source: "blog", count: Math.round(total * 0.18) },
      { source: "qr", count: Math.round(total * 0.12) },
      { source: "x", count: Math.round(total * 0.08) },
      { source: "email", count: Math.round(total * 0.07) },
    ],
    countryClicks: [
      { country: "KR", count: Math.round(total * 0.61) },
      { country: "US", count: Math.round(total * 0.14) },
      { country: "JP", count: Math.round(total * 0.09) },
      { country: "SG", count: Math.round(total * 0.05) },
      { country: "DE", count: Math.round(total * 0.04) },
      { country: "GB", count: Math.round(total * 0.03) },
      { country: "VN", count: Math.round(total * 0.02) },
      { country: "FR", count: Math.round(total * 0.02) },
    ],
    sharedLinks: buildSharedLinks(),
    profile: buildProfile(),
  };
}

/**
 * Three fake short links shown in the viral / share-card section. Hosts and titles are picked
 * from neutral surfaces (Spotify, Notion, an indie shop) so nothing implies endorsement of a real
 * brand. Click counts decay across the list so the first card reads as the "hot" share.
 */
function buildSharedLinks(): DemoSharedLink[] {
  return [
    {
      slug: "spring-drop",
      ogTitle: "봄 컬렉션 — 한정 100개",
      ogDescription: "5월 11일 18시 오픈. 카톡 채널 친구만 먼저.",
      host: "shop.haruatelier.com",
      channel: "kakao",
      clicks: 312,
      hot: true,
    },
    {
      slug: "launch-thread",
      ogTitle: "사이드 프로젝트 1년 회고 — 무엇이 통했고 무엇이 빗나갔나",
      ogDescription: "수익 0 에서 시작해 월 매출이 들어오기까지의 12개월.",
      host: "haru.notion.site",
      channel: "x",
      clicks: 147,
      hot: true,
    },
    {
      slug: "club-mix",
      ogTitle: "주말 작업용 플레이리스트 — 47곡 · 3h 12m",
      ogDescription: "딥하우스부터 LoFi 까지. 매주 금요일 갱신.",
      host: "open.spotify.com",
      channel: "slack",
      clicks: 64,
      hot: false,
    },
  ];
}

function buildProfile(): DemoProfile {
  return {
    handle: "haruatelier",
    displayName: "Haru Atelier",
    tagline: "메이커 · 작은 브랜드 운영",
    links: [
      {
        label: "봄 컬렉션 둘러보기",
        host: "shop.haruatelier.com",
        shape: "highlight",
      },
      {
        label: "신상 공지 카카오 채널 추가",
        host: "pf.kakao.com",
        shape: "link",
      },
      {
        label: "작업실 인터뷰 — 7분",
        host: "youtube.com",
        shape: "embed",
      },
      {
        label: "성수동 쇼룸",
        host: "naver.me",
        shape: "place",
      },
      {
        label: "디지털 명함",
        host: "kurl.me",
        shape: "contact",
      },
    ],
  };
}

function buildDaily(days: number): DailyClick[] {
  const out: DailyClick[] = [];
  // Seeded LCG so the chart shape is identical across reloads — no jitter that would make the
  // demo look fake on refresh.
  let seed = 0x9c7f3;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(TODAY_UTC.getTime() - i * 86_400_000);
    const dow = d.getUTCDay();
    // Weekday lift Mon–Thu, dip on weekend, slight upward drift over the window
    const weekdayMultiplier = dow === 0 || dow === 6 ? 0.5 : dow === 5 ? 0.75 : 1;
    const drift = 1 + ((days - 1 - i) / days) * 0.6;
    const noise = 0.7 + rand() * 0.6;
    const base = 38 * weekdayMultiplier * drift * noise;
    out.push({ date: isoDate(d), count: Math.max(0, Math.round(base)) });
  }
  return out;
}

function buildHeatmap(): HeatmapCell[] {
  const out: HeatmapCell[] = [];
  let seed = 0x4242;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      // Korean prime-time bump 19~23, business-hour secondary 11~14, dead zone 02~06
      let weight = 1;
      if (hour >= 19 && hour <= 23) weight = 6;
      else if (hour >= 11 && hour <= 14) weight = 3;
      else if (hour >= 2 && hour <= 6) weight = 0.2;
      const weekendDrop = dow === 0 || dow === 6 ? 0.6 : 1;
      const count = Math.round(weight * weekendDrop * (3 + rand() * 5));
      out.push({ dayOfWeek: String(dow), hour, count });
    }
  }
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
