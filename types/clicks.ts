export type DailyClick = { date: string; count: number };
export type HourClick = { hour: number; count: number };
export type DayOfWeekClick = { dayOfWeek: string; count: number };
export type HeatmapCell = { dayOfWeek: string; hour: number; count: number };
export type ReferrerClick = { referrer: string; count: number };
export type ReferrerHostClick = { host: string; count: number };
export type ChannelClick = { channel: string; count: number };
export type DeviceClick = { device: string; count: number };
export type OsClick = { os: string; count: number };
export type BrowserClick = { browser: string; count: number };
export type BotClick = { bot: string; count: number };
export type UtmCampaignClick = { campaign: string; count: number };
export type UtmSourceClick = { source: string; count: number };
export type UtmMediumClick = { medium: string; count: number };
export type UtmContentClick = { content: string; count: number };
export type UtmTermClick = { term: string; count: number };
export type SourceChannelClick = { source: string; count: number };

/**
 * 인앱 브라우저(카카오톡·인스타그램·라인 …) 안에서 열린 사람 클릭. 일반 브라우저는 아예 목록에
 * 없다 — "무슨 브라우저인가"가 아니라 "어느 앱 안에서 열렸나"에 답하는 축이고, 봇 신호가 아니다.
 */
export type ClientAppClick = { app: string; count: number };

/**
 * 브라우저의 {@code Sec-Fetch-Site} 값별 사람 클릭. {@code none} = 방문자가 스스로 열었고(타이핑·
 * 북마크·QR), {@code cross-site} = 다른 곳의 링크를 눌러 왔다. 헤더는 요청 시점에만 존재해 과거
 * 클릭엔 값이 없다 — 그런 클릭은 버킷에 담기는 게 아니라 아예 빠진다.
 */
export type FetchSiteClick = { fetchSite: string; count: number };

/** 이 링크를 실었던 블로그 글별 사람 클릭. 글이 지워졌으면 {@code title} 만 null 이고 클릭 수는 남는다. */
export type PostClick = { postId: number; title: string | null; count: number };

/**
 * 막대 하나가 아니라 시간축 위에서 읽는 유입 채널 — 몇 명을 보냈고, 언제 처음 나타났고, 그중
 * 몇 명이 다시 왔는지. 클릭 수만으로는 "인스타는 네 시간 만에 타고 끝났고 노션은 사흘째
 * 꾸준하다"가 둘 다 그냥 숫자로 보인다.
 */
export type ChannelDepth = {
  host: string;
  count: number;
  /** ISO-8601 instant */
  firstSeenAt: string;
  returningVisitors: number;
  /** 0~1 */
  returnRatio: number;
};
export type CountryClick = { country: string; count: number };
export type RegionClick = { region: string; count: number };
export type CityClick = { city: string; count: number };
export type LanguageClick = { language: string; count: number };
export type AsnClick = { asn: number | null; organization: string; count: number };

export type Velocity = {
  currentHour: number;
  baselinePerHour: number;
  ratio: number;
};
