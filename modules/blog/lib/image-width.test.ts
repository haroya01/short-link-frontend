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
  it("round-trips intrinsic dims, with or without a width marker", () => {
    expect(parseImageAlt(altWithWidth("Shot", "wide", { w: 1200, h: 800 }))).toEqual({
      width: "wide",
      dims: { w: 1200, h: 800 },
      alt: "Shot",
    });
    expect(parseImageAlt(altWithWidth("Shot", undefined, { w: 640, h: 480 }))).toEqual({
      dims: { w: 640, h: 480 },
      alt: "Shot",
    });
  });
  it("keeps the width marker FIRST so the editor's alt^=«wide» CSS still matches", () => {
    expect(altWithWidth("Shot", "wide", { w: 1200, h: 800 })).toBe("«wide» «1200x800» Shot");
  });
  it("ignores zero / missing dims (graceful degrade)", () => {
    expect(altWithWidth("Shot", "wide", { w: 0, h: 0 })).toBe("«wide» Shot");
    expect(parseImageAlt("«wide» Shot")).toEqual({ width: "wide", alt: "Shot" });
  });
});
