import type { BookingProvider } from "@/types";

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
};

const NAVER_BOOKING_NAME = String.fromCharCode(0xb124, 0xc774, 0xbc84, 0x0020, 0xc608, 0xc57d);
const KAKAO_CHANNEL_NAME = String.fromCharCode(
  0xce74,
  0xce74,
  0xc624,
  0x0020,
  0xd1a1,
  0xcc44,
  0xb110,
);
const CATCHTABLE_NAME = String.fromCharCode(0xce90, 0xce58, 0xd14c, 0xc774, 0xbe14);

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
    name: NAVER_BOOKING_NAME,
  },
  { id: "kakao_channel", hosts: ["pf.kakao.com"], name: KAKAO_CHANNEL_NAME },
  {
    id: "microsoft_bookings",
    hosts: ["outlook.office.com", "outlook.office365.com", "bookwithme.microsoft.com"],
    name: "Microsoft Bookings",
  },
  { id: "tidycal", hosts: ["tidycal.com", "www.tidycal.com"], name: "TidyCal" },
  { id: "acuity", hosts: ["app.acuityscheduling.com"], name: "Acuity" },
  { id: "catchtable", hosts: ["app.catchtable.co.kr", "catchtable.co.kr"], name: CATCHTABLE_NAME },
] as const;

export function resolveBookingProvider(url: string): ProviderSpec | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.host.toLowerCase();
  for (const p of PROVIDERS) {
    if (p.hosts.includes(host)) return p;
  }
  return null;
}

export const BOOKING_PROVIDERS = PROVIDERS;
