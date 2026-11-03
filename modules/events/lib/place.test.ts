import { describe, expect, it } from "vitest";
import { clearPlace, editPlaceText, pickPlace, placeIdFromUrl, savedPlace } from "./place";

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
