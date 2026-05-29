import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { directionsUrl, staticMapUrl } from "./google-maps-static";

const KEY_ENV = "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY";

describe("staticMapUrl", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[KEY_ENV];
    process.env[KEY_ENV] = "test-key-abc";
  });

  afterEach(() => {
    if (original === undefined) delete process.env[KEY_ENV];
    else process.env[KEY_ENV] = original;
  });

  it("builds a fully-formed staticmap URL with marker + key", () => {
    const url = staticMapUrl({ lat: 37.5237, lng: 127.0386 });
    expect(url).toContain("https://maps.googleapis.com/maps/api/staticmap?");
    expect(url).toContain("center=37.5237%2C127.0386");
    expect(url).toContain("markers=color%3A0xEC4899%7C37.5237%2C127.0386");
    expect(url).toContain("key=test-key-abc");
  });

  it("uses default zoom 16 and size 600x360 and scale 2", () => {
    const url = staticMapUrl({ lat: 0, lng: 0 });
    expect(url).toContain("zoom=16");
    expect(url).toContain("size=600x360");
    expect(url).toContain("scale=2");
  });

  it("respects overrides", () => {
    const url = staticMapUrl({ lat: 0, lng: 0, zoom: 13, size: "400x200", scale: 1 });
    expect(url).toContain("zoom=13");
    expect(url).toContain("size=400x200");
    expect(url).toContain("scale=1");
  });

  it("appends multiple style parameters (one per directive)", () => {
    const url = staticMapUrl({ lat: 0, lng: 0 });
    const styleMatches = url.match(/style=/g) ?? [];
    expect(styleMatches.length).toBe(3);
    expect(url).toContain("feature%3Apoi%7Cvisibility%3Aoff");
    expect(url).toContain("feature%3Atransit%7Cvisibility%3Aoff");
  });

  it("returns empty string when API key is missing (graceful fallback)", () => {
    delete process.env[KEY_ENV];
    const url = staticMapUrl({ lat: 0, lng: 0 });
    expect(url).toBe("");
  });

  it("never throws on extreme coordinates (international date line, poles)", () => {
    expect(() => staticMapUrl({ lat: 90, lng: 180 })).not.toThrow();
    expect(() => staticMapUrl({ lat: -90, lng: -180 })).not.toThrow();
  });
});

describe("directionsUrl", () => {
  it("builds a Google Maps Directions URL with destination coords", () => {
    const url = directionsUrl({ lat: 37.5237, lng: 127.0386 });
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=37.5237%2C127.0386",
    );
  });

  it("appends destination_place_id when provided (Google picks exact business)", () => {
    const url = directionsUrl({
      lat: 37.5237,
      lng: 127.0386,
      placeId: "ChIJxxxxxxxx",
    });
    expect(url).toContain("destination_place_id=ChIJxxxxxxxx");
  });

  it("appends destination_name when provided (Google Maps shows business name in UI)", () => {
    const url = directionsUrl({ lat: 37.5237, lng: 127.0386, name: "Nudake Dosan" });
    expect(url).toContain("destination_name=Nudake+Dosan");
  });

  it("omits optional fields when null/undefined", () => {
    const url = directionsUrl({
      lat: 37.5237,
      lng: 127.0386,
      placeId: null,
      name: null,
    });
    expect(url).not.toContain("destination_place_id");
    expect(url).not.toContain("destination_name");
  });

  it("doesn't depend on API key (Maps URLs are unsigned)", () => {
    // Maps URLs are a free, key-less API — they're just deep links into the Maps web/app. We
    // explicitly don't append a key here; removing the env shouldn't change the output.
    const before = process.env[KEY_ENV];
    delete process.env[KEY_ENV];
    expect(directionsUrl({ lat: 1, lng: 2 })).toContain("api=1");
    if (before !== undefined) process.env[KEY_ENV] = before;
  });
});
