import { describe, expect, it } from "vitest";
import {
  parseBookingConfig,
  parseContactCardConfig,
  parseEmailFormConfig,
  parseEventConfig,
  parseGalleryConfig,
  parsePlaceConfig,
  parseProductCardConfig,
} from "./block-config-parsers";

describe("parseBookingConfig", () => {
  it("returns full config from valid JSON", () => {
    const out = parseBookingConfig(
      JSON.stringify({
        url: "https://calendly.com/x",
        title: "30분 상담",
        description: "Zoom or in person",
        ctaLabel: "예약하기",
      }),
    );
    expect(out).toEqual({
      url: "https://calendly.com/x",
      title: "30분 상담",
      description: "Zoom or in person",
      ctaLabel: "예약하기",
    });
  });

  it("returns empty defaults on malformed JSON", () => {
    expect(parseBookingConfig("not json")).toEqual({
      url: "",
      title: null,
      description: null,
      ctaLabel: null,
    });
  });

  it("coerces non-string fields to null (defensive against bad backend response)", () => {
    const out = parseBookingConfig(JSON.stringify({ url: 123, title: null }));
    expect(out.url).toBe("");
    expect(out.title).toBeNull();
  });
});

describe("parseEventConfig", () => {
  it("returns event when title + startsAt present", () => {
    const out = parseEventConfig(
      JSON.stringify({ title: "팝업", startsAt: "2026-06-15T14:00:00+09:00" }),
    );
    expect(out?.title).toBe("팝업");
    expect(out?.startsAt).toBe("2026-06-15T14:00:00+09:00");
    expect(out?.location).toBeNull();
  });

  it("returns null without required fields", () => {
    expect(parseEventConfig(JSON.stringify({ title: "x" }))).toBeNull();
    expect(parseEventConfig(JSON.stringify({ startsAt: "x" }))).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseEventConfig("not json")).toBeNull();
  });
});

describe("parseEmailFormConfig", () => {
  it("returns parsed config from valid JSON", () => {
    expect(
      parseEmailFormConfig(
        JSON.stringify({ title: "구독", placeholder: "이메일", successMessage: "감사" }),
      ),
    ).toEqual({ title: "구독", placeholder: "이메일", successMessage: "감사" });
  });

  it("falls back to {title: raw} for malformed JSON (legacy v0 shape compat)", () => {
    // Old EMAIL_FORM blocks stored a plain title string before we moved to JSON.
    expect(parseEmailFormConfig("plain old title")).toEqual({
      title: "plain old title",
      placeholder: null,
      successMessage: null,
    });
  });
});

describe("parseGalleryConfig", () => {
  it("returns image array from valid JSON", () => {
    expect(parseGalleryConfig(JSON.stringify({ images: ["a", "b", "c"] }))).toEqual({
      images: ["a", "b", "c"],
    });
  });

  it("filters out non-string + empty images", () => {
    expect(
      parseGalleryConfig(JSON.stringify({ images: ["a", "", null, 5, "b"] })),
    ).toEqual({ images: ["a", "b"] });
  });

  it("returns empty array on malformed JSON", () => {
    expect(parseGalleryConfig("not json")).toEqual({ images: [] });
  });
});

describe("parseProductCardConfig", () => {
  it("parses items with multiple images + focal points", () => {
    const out = parseProductCardConfig(
      JSON.stringify({
        title: "메뉴",
        items: [
          {
            name: "딸기 케이크",
            images: [
              { url: "https://x/1.jpg", focalX: 40, focalY: 30 },
              { url: "https://x/2.jpg" }, // focal defaults to 50/50
            ],
            price: "45,000원",
          },
        ],
      }),
    );
    expect(out.title).toBe("메뉴");
    expect(out.items[0].images).toEqual([
      { url: "https://x/1.jpg", focalX: 40, focalY: 30 },
      { url: "https://x/2.jpg", focalX: 50, focalY: 50 },
    ]);
  });

  it("supports legacy image: string field (auto-wrapped into 1-element images)", () => {
    const out = parseProductCardConfig(
      JSON.stringify({
        items: [{ name: "x", image: "https://x/old.jpg" }],
      }),
    );
    expect(out.items[0].images).toEqual([
      { url: "https://x/old.jpg", focalX: 50, focalY: 50 },
    ]);
  });

  it("filters out items with empty name", () => {
    const out = parseProductCardConfig(
      JSON.stringify({
        items: [{ name: "" }, { name: "valid" }, { name: null }, {}],
      }),
    );
    expect(out.items.map((i) => i.name)).toEqual(["valid"]);
  });

  it("clamps focal point to 0..100", () => {
    const out = parseProductCardConfig(
      JSON.stringify({
        items: [
          {
            name: "x",
            images: [{ url: "https://x/1.jpg", focalX: -50, focalY: 150 }],
          },
        ],
      }),
    );
    expect(out.items[0].images[0]).toEqual({
      url: "https://x/1.jpg",
      focalX: 0,
      focalY: 100,
    });
  });

  it("returns empty defaults on malformed JSON", () => {
    expect(parseProductCardConfig("not json")).toEqual({ title: null, items: [] });
  });
});

describe("parseContactCardConfig", () => {
  it("parses full contact card", () => {
    const out = parseContactCardConfig(
      JSON.stringify({
        name: "도현 김",
        title: "Founder",
        company: "kurl.me",
        email: "founder@kurl.me",
        phone: "+82 10-1234-5678",
        address: "서울",
        website: "https://kurl.me",
        logoUrl: "https://img/logo.png",
        palette: "amethyst",
      }),
    );
    expect(out.name).toBe("도현 김");
    expect(out.palette).toBe("amethyst");
  });

  it("returns empty-shaped object on malformed JSON (not null — visitor sees broken card explicitly)", () => {
    const out = parseContactCardConfig("not json");
    expect(out.name).toBe("");
    expect(out.email).toBeNull();
  });

  it("coerces missing string fields to null", () => {
    const out = parseContactCardConfig(JSON.stringify({ name: "x" }));
    expect(out.email).toBeNull();
    expect(out.phone).toBeNull();
  });

  it("defaults logo focal point to 50/50 when omitted (legacy data)", () => {
    const out = parseContactCardConfig(JSON.stringify({ name: "x", logoUrl: "x.png" }));
    expect(out.logoFocalX).toBe(50);
    expect(out.logoFocalY).toBe(50);
  });

  it("parses and clamps logo focal point to [0, 100]", () => {
    const out = parseContactCardConfig(
      JSON.stringify({ name: "x", logoFocalX: 120, logoFocalY: -10 }),
    );
    expect(out.logoFocalX).toBe(100);
    expect(out.logoFocalY).toBe(0);
  });
});

describe("parsePlaceConfig", () => {
  it("parses full place with all optional fields", () => {
    const out = parsePlaceConfig(
      JSON.stringify({
        name: "누데이크 도산",
        address: "서울 강남구",
        lat: 37.5237,
        lng: 127.0386,
        placeId: "ChIJxxxx",
        phone: "02-1234",
        coverUrl: "https://img/store.jpg",
        category: "cafe",
        hoursText: "매일 11-22",
      }),
    );
    expect(out).not.toBeNull();
    expect(out?.name).toBe("누데이크 도산");
    expect(out?.category).toBe("cafe");
  });

  it("returns null when required fields missing", () => {
    expect(parsePlaceConfig(JSON.stringify({ name: "x" }))).toBeNull();
    expect(
      parsePlaceConfig(JSON.stringify({ name: "x", address: "y", lat: 37 })),
    ).toBeNull();
  });

  it("returns null when lat/lng wrong type (string instead of number)", () => {
    expect(
      parsePlaceConfig(
        JSON.stringify({ name: "x", address: "y", lat: "37", lng: "127" }),
      ),
    ).toBeNull();
  });

  it("drops unknown category to null (forward-compat with newer backend categories)", () => {
    const out = parsePlaceConfig(
      JSON.stringify({
        name: "x",
        address: "y",
        lat: 37,
        lng: 127,
        category: "futureCategory",
      }),
    );
    expect(out?.category).toBeNull();
  });

  it("accepts all 8 valid categories", () => {
    for (const cat of [
      "cafe",
      "bakery",
      "restaurant",
      "retail",
      "studio",
      "gallery",
      "popup",
      "space",
    ]) {
      const out = parsePlaceConfig(
        JSON.stringify({ name: "x", address: "y", lat: 37, lng: 127, category: cat }),
      );
      expect(out?.category).toBe(cat);
    }
  });

  it("returns null on malformed JSON", () => {
    expect(parsePlaceConfig("not json")).toBeNull();
  });
});
