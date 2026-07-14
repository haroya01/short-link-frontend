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

describe("image align markers", () => {
  it("round-trips left / right through the alt marker", () => {
    expect(parseImageAlt(altWithWidth("Shot", undefined, undefined, "left"))).toEqual({
      align: "left",
      alt: "Shot",
    });
    expect(parseImageAlt(altWithWidth("Shot", undefined, undefined, "right"))).toEqual({
      align: "right",
      alt: "Shot",
    });
  });
  it("does NOT emit a marker for center (the default) so a centered image's alt stays clean", () => {
    expect(altWithWidth("Shot", undefined, undefined, "center")).toBe("Shot");
    expect(parseImageAlt("Shot")).toEqual({ alt: "Shot" });
  });
  it("keeps width FIRST, then align, then dims", () => {
    expect(altWithWidth("Shot", "half", { w: 1200, h: 800 }, "right")).toBe("«half» «right» «1200x800» Shot");
    expect(parseImageAlt("«half» «right» «1200x800» Shot")).toEqual({
      width: "half",
      align: "right",
      dims: { w: 1200, h: 800 },
      alt: "Shot",
    });
  });
  it("parses align on its own and alongside a width", () => {
    expect(parseImageAlt("«left» Shot")).toEqual({ align: "left", alt: "Shot" });
    expect(parseImageAlt("«wide» «left» Shot")).toEqual({ width: "wide", align: "left", alt: "Shot" });
  });
});
