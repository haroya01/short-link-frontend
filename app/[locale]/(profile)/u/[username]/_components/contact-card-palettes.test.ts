import { describe, expect, it } from "vitest";
import { getPalette, PALETTES } from "./contact-card-palettes";

describe("getPalette", () => {
  it("returns the requested palette by id", () => {
    expect(getPalette("rose-gold").id).toBe("rose-gold");
    expect(getPalette("emerald").id).toBe("emerald");
    expect(getPalette("midnight").id).toBe("midnight");
  });

  it("falls back to amethyst (the first / default palette) for null / undefined", () => {
    expect(getPalette(null).id).toBe("amethyst");
    expect(getPalette(undefined).id).toBe("amethyst");
  });

  it("returns a palette with exactly 6 color stops", () => {
    for (const id of PALETTES.map((p) => p.id)) {
      const p = getPalette(id);
      expect(p.colors).toHaveLength(6);
    }
  });
});

describe("PALETTES", () => {
  it("contains exactly the 8 ids the backend whitelists (ContactCard.ALLOWED_PALETTES)", () => {
    const ids = PALETTES.map((p) => p.id).sort();
    expect(ids).toEqual(
      [
        "amethyst",
        "aurora",
        "champagne",
        "emerald",
        "midnight",
        "rose-gold",
        "sapphire",
        "sunset",
      ].sort(),
    );
  });

  it("every palette has a substrate hex color and two rgba ambient overlays", () => {
    for (const p of PALETTES) {
      expect(p.substrate).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(p.ambient).toHaveLength(2);
      for (const a of p.ambient) {
        expect(a).toMatch(/^rgba\(/);
      }
    }
  });
});
