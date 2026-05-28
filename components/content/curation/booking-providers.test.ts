import { describe, expect, it } from "vitest";
import { resolveBookingProvider, BOOKING_PROVIDERS } from "@/components/content/curation/booking-providers";

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

describe("BOOKING_PROVIDERS", () => {
  it("every provider has at least one host and a human-readable name", () => {
    for (const p of BOOKING_PROVIDERS) {
      expect(p.hosts.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});
