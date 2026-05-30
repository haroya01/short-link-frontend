import { describe, expect, it } from "vitest";
import { altWithWidth, parseImageAlt } from "./image-width";

describe("image width markers", () => {
  it("round-trips wide / full through the alt marker", () => {
    expect(parseImageAlt(altWithWidth("My photo", "wide"))).toEqual({ width: "wide", alt: "My photo" });
    expect(parseImageAlt(altWithWidth("Hero", "full"))).toEqual({ width: "full", alt: "Hero" });
  });
  it("leaves a normal alt untouched", () => {
    expect(parseImageAlt("just alt")).toEqual({ alt: "just alt" });
    expect(altWithWidth("just alt", undefined)).toBe("just alt");
  });
});
