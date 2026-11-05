import { describe, expect, it } from "vitest";
import { clearPlace, editPlaceText, mapStart, pickPlace, placeIdFromUrl, savedPlace } from "./place";

const shibuya = { placeId: "ChIJ-shibuya_1", main: "渋谷駅", secondary: "日本、東京都渋谷区" };
const shibuyaLink =
  "https://www.google.com/maps/search/?api=1&query=%E6%B8%8B%E8%B0%B7%E9%A7%85&query_place_id=ChIJ-shibuya_1";

describe("placeIdFromUrl", () => {
  it("reads the place id whether it ends the query or another parameter follows", () => {
    expect(placeIdFromUrl(shibuyaLink)).toBe("ChIJ-shibuya_1");
    expect(placeIdFromUrl("https://www.google.com/maps/search/?query_place_id=ChIJabc&api=1")).toBe("ChIJabc");
  });

  it("finds nothing in links without one", () => {
    expect(placeIdFromUrl("")).toBeNull();
    expect(placeIdFromUrl("https://naver.me/5abc")).toBeNull();
    expect(placeIdFromUrl("https://www.google.com/maps/search/?api=1&query=Shibuya")).toBeNull();
    expect(placeIdFromUrl("https://www.google.com/maps/search/?api=1&query_place_id=")).toBeNull();
  });

  it("does not read a parameter that only ends in query_place_id", () => {
    expect(placeIdFromUrl("https://example.com/?myquery_place_id=ChIJabc")).toBeNull();
  });

  it("stops at characters a place id never has", () => {
    expect(placeIdFromUrl("https://www.google.com/maps/search/?query_place_id=ChIJabc#map")).toBe("ChIJabc");
  });
});

describe("picking a place and typing after it", () => {
  it("picking fills the name, a place link and the address", () => {
    expect(pickPlace(shibuya)).toEqual({
      text: "渋谷駅",
      url: shibuyaLink,
      picked: { placeId: "ChIJ-shibuya_1", name: "渋谷駅", address: "日本、東京都渋谷区" },
    });
  });

  it("keeps the place while the text still starts with the picked name", () => {
    const next = editPlaceText(pickPlace(shibuya), "渋谷駅, 3층");
    expect(next).toEqual({ ...pickPlace(shibuya), text: "渋谷駅, 3층" });
  });

  it("lets go of the place and its link once the name itself changes", () => {
    expect(editPlaceText(pickPlace(shibuya), "渋谷")).toEqual({ text: "渋谷", url: "", picked: null });
    expect(editPlaceText(pickPlace(shibuya), "新宿駅, 3층")).toEqual({ text: "新宿駅, 3층", url: "", picked: null });
  });

  it("leaves a hand-entered link alone while typing", () => {
    const manual = { text: "성수", url: "https://naver.me/5abc", picked: null };
    expect(editPlaceText(manual, "성수 카페")).toEqual({ ...manual, text: "성수 카페" });
  });

  it("clearing empties the name, the link and the place", () => {
    expect(clearPlace()).toEqual({ text: "", url: "", picked: null });
  });
});

describe("reopening a saved event", () => {
  it("anchors on the name inside the saved link, so text added after it keeps the place", () => {
    const reopened = savedPlace("渋谷駅, 3층", shibuyaLink);
    expect(reopened.picked).toEqual({ placeId: "ChIJ-shibuya_1", name: "渋谷駅", address: null });
    expect(editPlaceText(reopened, "渋谷駅, 4층").picked).not.toBeNull();
    expect(editPlaceText(reopened, "渋谷, 4층").picked).toBeNull();
  });

  it("falls back to the whole text when it does not start with the link's name", () => {
    expect(savedPlace("Shibuya Station", shibuyaLink).picked?.name).toBe("Shibuya Station");
  });

  it("treats a link without a place id as hand-entered", () => {
    expect(savedPlace("성수 카페", "https://naver.me/5abc").picked).toBeNull();
  });

  it("has no place to anchor when the saved name is empty", () => {
    expect(savedPlace("", shibuyaLink).picked).toBeNull();
  });
});

describe("where the map opens", () => {
  it("opens on the city of the form's time zone", () => {
    expect(mapStart("Asia/Tokyo", "ko")).toEqual({ center: { lat: 35.6812, lng: 139.7671 }, zoom: 12 });
    expect(mapStart("Asia/Seoul", "ja")).toEqual({ center: { lat: 37.5665, lng: 126.978 }, zoom: 12 });
    expect(mapStart("America/Los_Angeles", "ko").center).toEqual({ lat: 34.0522, lng: -118.2437 });
  });

  it("falls back to the locale's city when the time zone has none", () => {
    expect(mapStart("UTC", "ko").center).toEqual({ lat: 37.5665, lng: 126.978 });
    expect(mapStart("UTC", "ja").center).toEqual({ lat: 35.6812, lng: 139.7671 });
  });

  it("shows the whole world when neither says where", () => {
    expect(mapStart("UTC", "en")).toEqual({ center: { lat: 20, lng: 0 }, zoom: 2 });
  });
});

describe("a place picked on the map", () => {
  it("fills the name and a link the event page can turn back into the same map", () => {
    const next = pickPlace({ placeId: "ChIJ-poi_1", main: "SHIBUYA SKY", secondary: "日本、〒150-0002 東京都渋谷区渋谷2丁目24−12" });
    expect(next.text).toBe("SHIBUYA SKY");
    expect(next.url).toBe("https://www.google.com/maps/search/?api=1&query=SHIBUYA%20SKY&query_place_id=ChIJ-poi_1");
    expect(placeIdFromUrl(next.url)).toBe("ChIJ-poi_1");
    expect(next.picked).toEqual({ placeId: "ChIJ-poi_1", name: "SHIBUYA SKY", address: "日本、〒150-0002 東京都渋谷区渋谷2丁目24−12" });
  });

  it("names a tapped spot after its address and does not repeat it as the address line", () => {
    const next = pickPlace({ placeId: "ChIJ-spot", main: "東京都渋谷区道玄坂1丁目2", secondary: "" });
    expect(next.text).toBe("東京都渋谷区道玄坂1丁目2");
    expect(next.picked?.address).toBeNull();
    expect(placeIdFromUrl(next.url)).toBe("ChIJ-spot");
  });
});
