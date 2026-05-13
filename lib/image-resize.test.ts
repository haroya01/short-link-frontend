import { describe, expect, it } from "vitest";
import { computeBox } from "./image-resize";

describe("computeBox — preserve-aspect (square=false)", () => {
  it("downscales when the longer edge exceeds maxDim", () => {
    const out = computeBox(2000, 1000, 500, false);
    // Longer edge = 2000 → scale = 500/2000 = 0.25. Dest = 500×250. Source rect = full image.
    expect(out).toEqual({ dw: 500, dh: 250, sx: 0, sy: 0, sw: 2000, sh: 1000 });
  });

  it("preserves portrait orientation in downscale", () => {
    const out = computeBox(800, 1600, 800, false);
    // Longer edge = 1600 → scale = 0.5. Dest = 400×800.
    expect(out).toEqual({ dw: 400, dh: 800, sx: 0, sy: 0, sw: 800, sh: 1600 });
  });

  it("never upscales when the image is already smaller than maxDim", () => {
    const out = computeBox(300, 200, 500, false);
    expect(out).toEqual({ dw: 300, dh: 200, sx: 0, sy: 0, sw: 300, sh: 200 });
  });

  it("rounds dest dims to integers — toBlob can't accept fractional canvas sizes", () => {
    const out = computeBox(333, 100, 100, false);
    // scale = 100/333 ≈ 0.3003. Dest w = 333 * 0.3003 = 100.0; h ≈ 30.03 → rounded to 30.
    expect(out.dw).toBe(100);
    expect(out.dh).toBe(30);
    expect(Number.isInteger(out.dw)).toBe(true);
    expect(Number.isInteger(out.dh)).toBe(true);
  });
});

describe("computeBox — center-square (square=true)", () => {
  it("center-crops a landscape image to the shorter edge", () => {
    const out = computeBox(2000, 1000, 500, true);
    // side = min(2000, 1000) = 1000. dim = min(500, 1000) = 500. Source rect centered: sx=500, sy=0.
    expect(out).toEqual({ dw: 500, dh: 500, sx: 500, sy: 0, sw: 1000, sh: 1000 });
  });

  it("center-crops a portrait image to the shorter edge", () => {
    const out = computeBox(800, 1600, 400, true);
    // side = 800. dim = 400. Source rect centered vertically: sx=0, sy=400.
    expect(out).toEqual({ dw: 400, dh: 400, sx: 0, sy: 400, sw: 800, sh: 800 });
  });

  it("never upscales — already-square smaller image stays at its native side", () => {
    const out = computeBox(300, 300, 500, true);
    expect(out).toEqual({ dw: 300, dh: 300, sx: 0, sy: 0, sw: 300, sh: 300 });
  });

  it("clamps the destination to maxDim even when the shorter edge is larger", () => {
    const out = computeBox(2000, 1500, 256, true);
    // side = 1500, dim = min(256, 1500) = 256. Source rect = 1500×1500, centered → sx = 250.
    expect(out).toEqual({ dw: 256, dh: 256, sx: 250, sy: 0, sw: 1500, sh: 1500 });
  });

  it("symmetrically centers the crop when input is wider than tall", () => {
    const out = computeBox(1000, 500, 200, true);
    // side = 500. (iw - side) / 2 = 250.
    expect(out.sx).toBe(250);
    expect(out.sy).toBe(0);
    expect(out.sw).toBe(500);
    expect(out.sh).toBe(500);
  });
});
