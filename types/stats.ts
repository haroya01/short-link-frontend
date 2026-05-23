import type {
  AsnClick,
  BotClick,
  BrowserClick,
  ChannelClick,
  CityClick,
  CountryClick,
  DailyClick,
  DayOfWeekClick,
  DeviceClick,
  HeatmapCell,
  HourClick,
  LanguageClick,
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
} from "./clicks";
import type { DestinationClick } from "./links";

export type LinkStats = {
  shortCode: string;
  timezone: string;
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  uniqueClicks: number;
  previewClicks: number;
  profileClicks: number;
  firstClickAt: string | null;
  lastClickAt: string | null;
  timeToFirstClickMinutes: number | null;
  peakHour: number | null;
  velocity: Velocity;
  returnRate?: { newVisitors: number; returningVisitors: number; ratio: number };
  dailyClicks: DailyClick[];
  hourClicks: HourClick[];
  dayOfWeekClicks: DayOfWeekClick[];
  heatmap: HeatmapCell[];
  referrerClicks: ReferrerClick[];
  referrerHostClicks: ReferrerHostClick[];
  channelClicks: ChannelClick[];
  deviceClicks: DeviceClick[];
  osClicks: OsClick[];
  browserClicks: BrowserClick[];
  botClicks2: BotClick[];
  utmCampaignClicks: UtmCampaignClick[];
  utmSourceClicks: UtmSourceClick[];
  utmMediumClicks: UtmMediumClick[];
  utmContentClicks: UtmContentClick[];
  sourceChannelClicks: SourceChannelClick[];
  destinationClicks: DestinationClick[];
  countryClicks: CountryClick[];
  regionClicks: RegionClick[];
  cityClicks: CityClick[];
  languageClicks: LanguageClick[];
  asnClicks: AsnClick[];
  datacenterClicks: number;
};

/**
 * Aggregated visit stats for one profile owner — backend {@code ProfileStats} 의 JSON shape.
 * LinkStats 와 비슷한 차트용 sub-records 를 공유하지만 link-only 필드 (destinations / preview /
 * lifecycle / return rate / insights) 는 제외.
 */
export type ProfileStats = {
  timezone: string;
  totalVisits: number;
  humanVisits: number;
  botVisits: number;
  uniqueVisits: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  peakHour: number | null;
  dailyVisits: DailyClick[];
  hourVisits: HourClick[];
  heatmap: HeatmapCell[];
  countryVisits: CountryClick[];
  deviceVisits: DeviceClick[];
  browserVisits: BrowserClick[];
  referrerHostVisits: ReferrerHostClick[];
  sourceChannelVisits: SourceChannelClick[];
  utmCampaignVisits: UtmCampaignClick[];
  utmSourceVisits: UtmSourceClick[];
};

export type ProfileVisitSummary = {
  today: number;
  week: number;
  month: number;
  allTime: number;
};

export type WeeklyInsights = {
  from: string;
  to: string;
  totalClicks: number;
  humanClicks: number;
  previousHumanClicks: number;
  deltaPercent: number | null;
  humanRatio: number | null;
  topLink: {
    shortCode: string;
    originalUrl: string;
    clicks: number;
    topUtmSource: string | null;
  } | null;
  peak: {
    dayOfWeek: number;
    hour: number;
    clicks: number;
  } | null;
};
