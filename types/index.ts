export type CreateLinkRequest = {
  url: string;
  customCode?: string;
  expiresAt?: string;
};

export type CreateLinkResponse = {
  shortCode: string;
  shortUrl: string;
};

export type MyLink = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clickCount: number;
};

export type MyLinksPage = {
  items: MyLink[];
  total: number;
};

export type UpdateLinkRequest = {
  originalUrl?: string;
  expiresAt?: string | null;
};

export type LinkDetail = {
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogTitleOverride: string | null;
  ogDescriptionOverride: string | null;
  ogImageOverride: string | null;
  passwordProtected: boolean;
  maxViews: number | null;
  viewCount: number;
  statsPublic: boolean;
};

export type OgOverrideRequest = {
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
};

export type OgOverrideResponse = {
  shortCode: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
};

export type LinkProtectionRequest = {
  password?: string | null;
  maxViews?: number | null;
};

export type LinkProtectionResponse = {
  shortCode: string;
  passwordProtected: boolean;
  maxViews: number | null;
  viewCount: number;
};

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
export type CountryClick = { country: string; count: number };
export type RegionClick = { region: string; count: number };
export type CityClick = { city: string; count: number };
export type LanguageClick = { language: string; count: number };

export type Velocity = {
  currentHour: number;
  baselinePerHour: number;
  ratio: number;
};

export type LinkStats = {
  shortCode: string;
  timezone: string;
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  uniqueClicks: number;
  firstClickAt: string | null;
  timeToFirstClickMinutes: number | null;
  velocity: Velocity;
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
  countryClicks: CountryClick[];
  regionClicks: RegionClick[];
  cityClicks: CityClick[];
  languageClicks: LanguageClick[];
};

export type Me = {
  id: number;
  email: string;
  provider?: string;
  oauthProvider?: string;
  role: "USER" | "ADMIN";
  timezone?: string;
  createdAt: string;
};

export type AdminOverview = {
  totals: { users: number; links: number; clicks: number };
  newUsers7d: number;
  newLinks7d: number;
  clicks7d: number;
  anonymousLinkRatio: number;
  expiredLinkRatio: number;
  clicklessLinkRatio: number;
  dailySignups: { date: string; count: number }[];
  dailyLinks: { date: string; count: number }[];
  dailyClicks: { date: string; count: number }[];
  topUsersByLinks: { userId: number; email: string; count: number }[];
  topUsersByClicks: { userId: number; email: string; count: number }[];
  topLinksByClicks: { shortCode: string; clickCount: number; ownerEmail: string | null }[];
};

export type ApiKeySummary = {
  id: number;
  prefix: string;
  name: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type IssuedApiKey = {
  id: number;
  rawKey: string;
  prefix: string;
  name: string | null;
  createdAt: string;
};

export type ProblemDetail = {
  status: number;
  title?: string;
  detail?: string;
  code?: string;
  errors?: { field: string; message: string }[];
};
