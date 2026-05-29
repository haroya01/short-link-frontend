import { describe, expect, it } from "vitest";
import {
  bookingSummary,
  countGalleryImages,
  eventSummary,
  placeSummary,
  productCardSummary,
  summarizeJsonField,
  summarizeTextBody,
} from "./feed-summarizers";

describe("summarizeTextBody", () => {
  it("returns the raw string when content is plain markdown (legacy / inline layout)", () => {
    expect(summarizeTextBody("Hello world")).toBe("Hello world");
    expect(summarizeTextBody("# Heading\n\nbody")).toBe("# Heading\n\nbody");
  });

  it("extracts the body field from a JSON payload (PR #137 shape)", () => {
    expect(
      summarizeTextBody(
        JSON.stringify({ body: "Heads up!", layout: "card", accent: "amber" }),
      ),
    ).toBe("Heads up!");
  });

  it("falls back to the raw string when the JSON has no body field", () => {
    const raw = JSON.stringify({ layout: "card" });
    expect(summarizeTextBody(raw)).toBe(raw);
  });

  it("returns the raw string when JSON parse fails (markdown that happens to start with '{')", () => {
    expect(summarizeTextBody("{not json after all}")).toBe("{not json after all}");
  });

  it("returns empty for null / empty input", () => {
    expect(summarizeTextBody(null)).toBe("");
    expect(summarizeTextBody("")).toBe("");
  });
});

describe("summarizeJsonField", () => {
  it("returns the requested string field when present", () => {
    expect(
      summarizeJsonField(JSON.stringify({ name: "Coffee Shop", x: 42 }), "name"),
    ).toBe("Coffee Shop");
  });

  it("returns empty when the field is missing / wrong type", () => {
    expect(summarizeJsonField(JSON.stringify({ name: 123 }), "name")).toBe("");
    expect(summarizeJsonField(JSON.stringify({}), "name")).toBe("");
  });

  it("returns empty for null / malformed JSON", () => {
    expect(summarizeJsonField(null, "name")).toBe("");
    expect(summarizeJsonField("not json", "name")).toBe("");
  });
});

describe("productCardSummary", () => {
  it("renders title + item count when title is set", () => {
    expect(
      productCardSummary(
        JSON.stringify({ title: "메뉴", items: [{ name: "a" }, { name: "b" }] }),
      ),
    ).toBe("메뉴 · 2");
  });

  it("falls back to first-item name + count when no title", () => {
    expect(
      productCardSummary(JSON.stringify({ items: [{ name: "딸기 케이크" }, {}, {}] })),
    ).toBe("딸기 케이크 +2");
  });

  it("returns empty when items is empty", () => {
    expect(productCardSummary(JSON.stringify({ items: [] }))).toBe("");
  });

  it("returns empty for malformed input", () => {
    expect(productCardSummary(null)).toBe("");
    expect(productCardSummary("not json")).toBe("");
  });
});

describe("eventSummary", () => {
  it("renders title + short date when both present", () => {
    const out = eventSummary(
      JSON.stringify({ title: "팝업 오픈", startsAt: "2026-06-15T14:00:00+09:00" }),
    );
    expect(out).toMatch(/^팝업 오픈 ·/);
    // Locale-dependent format, but the title prefix is stable.
  });

  it("returns title only when startsAt is missing", () => {
    expect(eventSummary(JSON.stringify({ title: "팝업" }))).toBe("팝업");
  });

  it("returns title only when startsAt is unparseable", () => {
    expect(eventSummary(JSON.stringify({ title: "팝업", startsAt: "garbage" }))).toBe(
      "팝업",
    );
  });

  it("returns empty when both title and startsAt are missing", () => {
    expect(eventSummary(JSON.stringify({}))).toBe("");
  });

  it("returns empty for malformed input", () => {
    expect(eventSummary(null)).toBe("");
    expect(eventSummary("not json")).toBe("");
  });
});

describe("bookingSummary", () => {
  it("prefers title when set", () => {
    expect(
      bookingSummary(JSON.stringify({ title: "30분 상담", url: "https://calendly.com/x" })),
    ).toBe("30분 상담");
  });

  it("falls back to url host (without www.) when no title", () => {
    expect(
      bookingSummary(JSON.stringify({ url: "https://www.calendly.com/dohyun" })),
    ).toBe("calendly.com");
  });

  it("falls back to the raw url string when it's not a valid URL", () => {
    expect(bookingSummary(JSON.stringify({ url: "calendly.com/dohyun" }))).toBe(
      "calendly.com/dohyun",
    );
  });

  it("returns empty when no title + no url", () => {
    expect(bookingSummary(JSON.stringify({}))).toBe("");
  });

  it("returns empty for malformed input", () => {
    expect(bookingSummary(null)).toBe("");
    expect(bookingSummary("not json")).toBe("");
  });
});

describe("placeSummary", () => {
  it("prefers name when set", () => {
    expect(
      placeSummary(JSON.stringify({ name: "누데이크 도산", address: "서울 강남구" })),
    ).toBe("누데이크 도산");
  });

  it("falls back to address when name is missing", () => {
    expect(placeSummary(JSON.stringify({ address: "서울 강남구" }))).toBe("서울 강남구");
  });

  it("returns empty when both are missing", () => {
    expect(placeSummary(JSON.stringify({}))).toBe("");
  });

  it("returns empty for malformed input", () => {
    expect(placeSummary(null)).toBe("");
    expect(placeSummary("not json")).toBe("");
  });
});

describe("countGalleryImages", () => {
  it("returns the images array length", () => {
    expect(countGalleryImages(JSON.stringify({ images: ["a", "b", "c"] }))).toBe(3);
    expect(countGalleryImages(JSON.stringify({ images: [] }))).toBe(0);
  });

  it("returns 0 for missing images / wrong type", () => {
    expect(countGalleryImages(JSON.stringify({}))).toBe(0);
    expect(countGalleryImages(JSON.stringify({ images: "wrong" }))).toBe(0);
  });

  it("returns 0 for malformed input", () => {
    expect(countGalleryImages(null)).toBe(0);
    expect(countGalleryImages("not json")).toBe(0);
  });
});
