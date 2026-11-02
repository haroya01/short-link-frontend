import { describe, expect, it } from "vitest";
import { bookingProvidersFor, resolveBookingProvider } from "@/modules/profile/curation/booking-providers";

describe("resolveBookingProvider", () => {
  it("resolves Calendly URL", () => {
    expect(resolveBookingProvider("https://calendly.com/me/30min")?.id).toBe("calendly");
  });

  it("resolves Cal.com (root and app subdomain)", () => {
    expect(resolveBookingProvider("https://cal.com/me")?.id).toBe("cal_com");
    expect(resolveBookingProvider("https://app.cal.com/me")?.id).toBe("cal_com");
  });

  it("resolves Naver booking (web + mobile)", () => {
    expect(resolveBookingProvider("https://booking.naver.com/booking/13/123")?.id).toBe(
      "naver_booking",
    );
    expect(resolveBookingProvider("https://m.booking.naver.com/booking/13/123")?.id).toBe(
      "naver_booking",
    );
  });

  it("resolves Kakao channel (pf.kakao.com)", () => {
    expect(resolveBookingProvider("https://pf.kakao.com/_abc/chat")?.id).toBe(
      "kakao_channel",
    );
  });

  it.each([
    ["https://beauty.hotpepper.jp/slnH000123456/", "hotpepper_beauty", "ホットペッパービューティー"],
    ["https://www.hotpepper.jp/strJ001234567/yoyaku/", "hotpepper_gourmet", "ホットペッパーグルメ"],
    ["https://tabelog.com/tokyo/A1301/A130101/13000000/", "tabelog", "食べログ"],
    ["https://s.tabelog.com/tokyo/A1301/A130101/13000000/", "tabelog", "食べログ"],
    ["https://www.tablecheck.com/ja/shops/kurl/reserve", "tablecheck", "TableCheck"],
    ["https://tablecheck.com/shops/kurl/reserve", "tablecheck", "TableCheck"],
    ["https://airrsv.net/kurl/calendar", "airreserve", "Airリザーブ"],
    ["https://reserva.be/kurl", "reserva", "RESERVA"],
    ["https://coubic.com/kurl/123456", "stores_reserve", "STORES 予約"],
    ["https://restaurant.ikyu.com/123456/", "ikyu_restaurant", "一休.comレストラン"],
  ])("resolves the Japanese provider at %s", (url, id, name) => {
    const provider = resolveBookingProvider(url);
    expect(provider?.id).toBe(id);
    expect(provider?.name).toBe(name);
  });

  it("matches a Japanese host exactly, not as a prefix of another domain", () => {
    expect(resolveBookingProvider("https://tabelog.com.example.com/")).toBeNull();
    expect(resolveBookingProvider("https://beauty.hotpepper.jp.example.com/")).toBeNull();
  });

  it("rejects unknown hosts", () => {
    expect(resolveBookingProvider("https://evil.example/phish")).toBeNull();
    expect(resolveBookingProvider("https://example.com")).toBeNull();
  });

  it("rejects non-http schemes", () => {
    expect(resolveBookingProvider("javascript:alert(1)")).toBeNull();
    expect(resolveBookingProvider("ftp://calendly.com/abc")).toBeNull();
  });

  it("returns null for empty / malformed input (no throw)", () => {
    expect(resolveBookingProvider("")).toBeNull();
    expect(resolveBookingProvider("not a url")).toBeNull();
  });
});

describe("bookingProvidersFor", () => {
  const JAPANESE = [
    "hotpepper_beauty", "hotpepper_gourmet", "tabelog", "tablecheck", "airreserve", "reserva", "stores_reserve",
    "ikyu_restaurant",
  ];

  it("lists the Japanese providers first for a Japanese editor", () => {
    expect(bookingProvidersFor("ja").slice(0, JAPANESE.length).map((p) => p.id)).toEqual(JAPANESE);
  });

  it("keeps the existing order everywhere else, Japanese providers last", () => {
    for (const locale of ["ko", "en", "vi", "hi"]) {
      const list = bookingProvidersFor(locale).map((p) => p.id);
      expect(list[0]).toBe("calendly");
      expect(list.slice(-JAPANESE.length)).toEqual(JAPANESE);
    }
  });

  it("shows the same providers in every locale", () => {
    const ids = (locale: string) => bookingProvidersFor(locale).map((p) => p.id).sort();
    expect(ids("ja")).toEqual(ids("ko"));
  });

  it("every provider has at least one host and a human-readable name", () => {
    for (const p of bookingProvidersFor("en")) {
      expect(p.hosts.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});
