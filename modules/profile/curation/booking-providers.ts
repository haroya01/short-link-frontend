import type { BookingProvider } from "@/types";
import { createHostResolver } from "@/modules/profile/curation/host-resolver";

/**
 * Frontend mirror of the backend's {@code Booking.Provider} host whitelist. Resolving on the client
 * is a UX nicety — pick the right icon / label without round-tripping — but the backend remains
 * the source of truth for actual validation. Keep this list in sync when adding a provider on the
 * backend, otherwise the dialog will save fine but show a generic icon.
 */
type ProviderSpec = {
  id: BookingProvider;
  hosts: readonly string[];
  /** Human-readable name shown in dialog hints and as a tag on the public card. */
  name: string;
  japan?: true;
  subdomainOf?: string;
  subdomainPath?: string;
};

const PROVIDERS: readonly ProviderSpec[] = [
  { id: "calendly", hosts: ["calendly.com", "www.calendly.com"], name: "Calendly" },
  { id: "cal_com", hosts: ["cal.com", "app.cal.com"], name: "Cal.com" },
  {
    id: "google_calendar",
    hosts: ["calendar.app.google", "calendar.google.com"],
    name: "Google Calendar",
  },
  {
    id: "naver_booking",
    hosts: ["booking.naver.com", "m.booking.naver.com"],
    name: "네이버 예약",
  },
  { id: "kakao_channel", hosts: ["pf.kakao.com"], name: "카카오 톡채널" },
  {
    id: "microsoft_bookings",
    hosts: ["outlook.office.com", "outlook.office365.com", "bookwithme.microsoft.com"],
    name: "Microsoft Bookings",
  },
  { id: "tidycal", hosts: ["tidycal.com", "www.tidycal.com"], name: "TidyCal" },
  { id: "acuity", hosts: ["app.acuityscheduling.com"], name: "Acuity" },
  { id: "catchtable", hosts: ["app.catchtable.co.kr", "catchtable.co.kr"], name: "캐치테이블" },
  {
    id: "hotpepper_beauty",
    hosts: ["beauty.hotpepper.jp"],
    name: "ホットペッパービューティー",
    japan: true,
  },
  { id: "hotpepper_gourmet", hosts: ["www.hotpepper.jp"], name: "ホットペッパーグルメ", japan: true },
  { id: "tabelog", hosts: ["tabelog.com", "s.tabelog.com"], name: "食べログ", japan: true },
  { id: "tablecheck", hosts: ["www.tablecheck.com", "tablecheck.com"], name: "TableCheck", japan: true },
  { id: "airreserve", hosts: ["airrsv.net"], name: "Airリザーブ", japan: true },
  { id: "reserva", hosts: ["reserva.be"], name: "RESERVA", japan: true },
  {
    id: "stores_reserve",
    hosts: ["coubic.com"],
    subdomainOf: ".stores.jp",
    subdomainPath: "/reserve/",
    name: "STORES 予約",
    japan: true,
  },
  { id: "ikyu_restaurant", hosts: ["restaurant.ikyu.com"], name: "一休.comレストラン", japan: true },
] as const;

const resolveByHost = createHostResolver(PROVIDERS);

/** Same check as the backend: the raw path, case-sensitive, with no percent-escape and no "..". */
function servesSubdomainPage(p: ProviderSpec, url: string): boolean {
  if (!p.subdomainOf || !p.subdomainPath) return false;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (!parsed.host.toLowerCase().endsWith(p.subdomainOf)) return false;
  const rawPath = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(url.trim())?.[1] ?? "";
  return (
    rawPath.startsWith(p.subdomainPath) &&
    !/[%\\]/.test(rawPath) &&
    !rawPath.split("/").includes("..")
  );
}

export function resolveBookingProvider(url: string): ProviderSpec | null {
  return resolveByHost(url) ?? PROVIDERS.find((p) => servesSubdomainPage(p, url)) ?? null;
}

export function bookingProvidersFor(locale: string): readonly ProviderSpec[] {
  if (locale !== "ja") return PROVIDERS;
  return [...PROVIDERS.filter((p) => p.japan), ...PROVIDERS.filter((p) => !p.japan)];
}
