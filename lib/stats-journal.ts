import type { ChannelDepth, LinkStats } from "@/types";

export type JournalEntry = {
  /** i18n 키 (stats.journal.*) */
  key: string;
  params: Record<string, string | number>;
  /** 근거 층 앵커 — 문장 클릭 시 스크롤 목적지 */
  evidence: string;
  /** 인라인 미니 드로잉 — 시계열 조각 */
  spark?: number[];
  /** 인라인 비율바 (0~1) */
  ratio?: number;
  weight: number;
};

/**
 * 백엔드 {@code LinkInsights} 와 같은 문턱값. 백엔드도 같은 두 문장(IN_APP_BROWSER·
 * CHANNEL_LOYALTY)을 만들지만 그 결과({@code insights})는 이 화면이 읽지 않는다 — 일지 문장의
 * 진실원은 여기 한 곳이다. 문턱을 맞춰 둬야 같은 링크를 웹과 API 로 봤을 때 말이 갈리지 않는다.
 */
const MIN_TOTAL_FOR_INSIGHTS = 10;
const MIN_HUMAN_FOR_VELOCITY = 30;
const IN_APP_SHARE_THRESHOLD = 0.2;
const CHANNEL_LOYALTY_THRESHOLD = 0.3;
const CHANNEL_LOYALTY_MIN_VISITORS = 5;

/**
 * 링크 일지 — "읽는 통계"의 심장. LinkStats 를 판단이 실린 문장 후보로 바꾼다.
 * 전부 실데이터 룰 기반(가드 미충족 문장은 아예 안 씀) — 과장광고 방지 계약은 여기서도 유효.
 * 문장은 중요도 순 상위 5개만: 일지는 요약이지 두 번째 대시보드가 아니다.
 */
export function buildJournal(data: LinkStats): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const total = data.totalClicks ?? 0;
  if (total === 0) return entries;

  const daily = data.dailyClicks ?? [];
  const counts = daily.map((d) => d.count);
  const human = data.humanClicks ?? 0;
  const enoughHuman = human >= MIN_TOTAL_FOR_INSIGHTS;

  // 지금 이 순간 — 평소 대비 속도. 저표본 게이트 필수: 총 2클릭짜리 링크가 "24.0배"를
  // 말하면 통계 전체의 신뢰가 무너진다(과장광고 방지 계약).
  const velocity = data.velocity?.ratio ?? 0;
  if (velocity >= 1.5 && human >= MIN_HUMAN_FOR_VELOCITY) {
    entries.push({
      key: "velocity",
      params: { x: velocity.toFixed(1) },
      evidence: "section-hourly",
      weight: 100,
    });
  }

  // 7일 추세 (직전 7일 대비)
  const last7 = counts.slice(-7).reduce((s, c) => s + c, 0);
  const prev7 = counts.slice(-14, -7).reduce((s, c) => s + c, 0);
  if (prev7 >= MIN_TOTAL_FOR_INSIGHTS) {
    const delta = (last7 - prev7) / prev7;
    if (Math.abs(delta) >= 0.15) {
      entries.push({
        key: delta >= 0 ? "trendUp" : "trendDown",
        params: { percent: Math.abs(Math.round(delta * 100)), count: last7 },
        evidence: "section-daily",
        spark: counts.slice(-14),
        weight: 90,
      });
    }
  }

  // 최고점이 있던 날
  if (counts.length > 0) {
    const peak = Math.max(...counts);
    const peakIdx = counts.lastIndexOf(peak);
    if (peak > 0 && daily[peakIdx]?.date) {
      entries.push({
        key: "peakDay",
        params: { date: daily[peakIdx].date.slice(5), count: peak },
        evidence: "section-daily",
        spark: counts.slice(Math.max(0, peakIdx - 6), peakIdx + 1),
        weight: 80,
      });
    }
  }

  // 상위 유입원의 지분
  const hosts = data.referrerHostClicks ?? [];
  if (hosts[0] && enoughHuman) {
    const share = hosts[0].count / human;
    if (share >= 0.25) {
      entries.push({
        key: "topSource",
        params: { host: hosts[0].host, percent: Math.round(share * 100) },
        evidence: "section-sources",
        ratio: share,
        weight: 75,
      });
    }
  }

  // 채널 충성도 — 클릭 1등이 아니라 재방문율 1등을 집는다. 한 번 터지고 끝난 채널과 사람을
  // 남긴 채널은 다른 이야기고, 다음에 어디에 올릴지를 정하는 건 후자다. 그래서 "언제 최고점을
  // 찍었나"(회고)보다 위에 둔다.
  const channels = data.channelDepth ?? [];
  let loyal: ChannelDepth | null = null;
  for (const c of channels) {
    // 재방문 수 자체가 표본 하한 — 한두 명에 비율이 요동치면 신호가 아니라 잡음이다.
    if (c.returningVisitors < CHANNEL_LOYALTY_MIN_VISITORS) continue;
    if (c.returnRatio < CHANNEL_LOYALTY_THRESHOLD) continue;
    if (!loyal || c.returnRatio > loyal.returnRatio) loyal = c;
  }
  if (loyal) {
    entries.push({
      key: "channelLoyalty",
      params: { host: loyal.host, percent: Math.round(loyal.returnRatio * 100) },
      evidence: "section-channel-depth",
      ratio: loyal.returnRatio,
      weight: 82,
    });
  }

  // 인앱 브라우저 — 링크가 어디에 붙어 있나가 아니라 어디에서 *열렸나*. 앱 웹뷰에서 로그인
  // 리다이렉트·다운로드·폰트가 곧잘 깨지니, 비중이 크면 오늘 고칠 수 있는 사실이 된다.
  const apps = data.clientAppClicks ?? [];
  if (apps.length > 0 && enoughHuman) {
    const share = apps.reduce((sum, a) => sum + a.count, 0) / human;
    if (share >= IN_APP_SHARE_THRESHOLD) {
      entries.push({
        key: "inAppBrowser",
        params: { percent: Math.round(share * 100) },
        evidence: "section-client-app",
        ratio: share,
        weight: 78,
      });
    }
  }

  // 하루 중 피크 시간
  if (typeof data.peakHour === "number" && data.peakHour !== null) {
    entries.push({
      key: "peakHour",
      params: { hour: data.peakHour },
      evidence: "section-hourly",
      weight: 70,
    });
  }

  // 재방문 — 링크가 소모품이 아니라는 신호. 채널별 충성도 문장이 이미 섰으면 쓰지 않는다:
  // 재방문 이야기 두 줄이 나란히 서면 일지가 아니라 대시보드가 된다(채널별이 더 구체적).
  const returning = data.returnRate?.ratio ?? 0;
  const visitors = (data.returnRate?.newVisitors ?? 0) + (data.returnRate?.returningVisitors ?? 0);
  if (!loyal && returning >= 0.15 && visitors >= MIN_TOTAL_FOR_INSIGHTS) {
    const days = data.rawSince ? data.rawRetentionDays : undefined;
    entries.push({
      key: days ? "returningRecent" : "returning",
      params: days ? { percent: Math.round(returning * 100), days } : { percent: Math.round(returning * 100) },
      evidence: "chapter-who",
      ratio: returning,
      weight: 65,
    });
  }

  // 최상위 국가 집중
  const topCountry = (data.countryClicks ?? []).find((c) => c.country !== "unknown");
  if (topCountry && enoughHuman) {
    const share = topCountry.count / human;
    if (share >= 0.4) {
      entries.push({
        key: "topCountry",
        params: { country: topCountry.country, percent: Math.round(share * 100) },
        evidence: "chapter-where",
        ratio: share,
        weight: 60,
      });
    }
  }

  // 기기 성향
  const devices = data.deviceClicks ?? [];
  const deviceShare = (name: string) =>
    (devices.find((d) => d.device.toLowerCase() === name)?.count ?? 0) / human;
  if (enoughHuman) {
    const mobile = deviceShare("mobile");
    const desktop = deviceShare("desktop");
    if (mobile >= 0.6) {
      entries.push({
        key: "mobileHeavy",
        params: { percent: Math.round(mobile * 100) },
        evidence: "section-device",
        ratio: mobile,
        weight: 55,
      });
    } else if (desktop >= 0.6) {
      entries.push({
        key: "desktopHeavy",
        params: { percent: Math.round(desktop * 100) },
        evidence: "section-device",
        ratio: desktop,
        weight: 55,
      });
    }
  }

  // 사람/봇 — 걷어낸 뒤의 진짜 숫자
  const botRatio = total >= MIN_TOTAL_FOR_INSIGHTS ? (data.botClicks ?? 0) / total : 0;
  if (botRatio >= 0.2) {
    entries.push({
      key: "botHigh",
      params: { percent: Math.round(botRatio * 100), human },
      evidence: "section-bots",
      ratio: botRatio,
      weight: 72,
    });
  } else if (botRatio >= 0.05) {
    entries.push({
      key: "botFiltered",
      params: { percent: Math.round(botRatio * 100), human },
      evidence: "section-bots",
      ratio: botRatio,
      weight: 50,
    });
  }

  // 첫 클릭까지 걸린 시간 — 빠르면 자랑거리
  const ttfc = data.timeToFirstClickMinutes;
  if (typeof ttfc === "number" && ttfc !== null && ttfc >= 0 && ttfc < 60) {
    entries.push({
      key: "fastFirstClick",
      params: { minutes: Math.max(1, Math.round(ttfc)) },
      evidence: "section-daily",
      weight: 40,
    });
  }

  return entries.sort((a, b) => b.weight - a.weight).slice(0, 5);
}
