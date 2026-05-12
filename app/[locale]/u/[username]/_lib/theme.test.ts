import { describe, expect, it } from "vitest";
import { THEME_TABLE, type ThemeColors } from "./theme";

/**
 * Regression guard for the THEME_TABLE shape — every theme must define every ThemeColors field.
 * TypeScript catches the {@link ThemeColors} structural check at compile time, but a forgotten
 * theme entry (e.g. adding a new theme via copy-paste and missing one token like {@code
 * ctaPrimary}) would still slip through if the new field is added with optional chaining or `??`
 * fallbacks elsewhere. The runtime check below ensures every theme is fully populated.
 */
const REQUIRED_FIELDS: readonly (keyof ThemeColors)[] = [
  "page",
  "card",
  "cardBorder",
  "cardHover",
  "primary",
  "muted",
  "avatar",
  "avatarText",
  "ctaPrimary",
];

describe("THEME_TABLE", () => {
  it("defines all known themes including the 'default' fallback", () => {
    const themes = Object.keys(THEME_TABLE);
    expect(themes).toContain("default");
    // Should have ProfileTheme entries + 'default'. 11 ProfileTheme variants + default = 12.
    expect(themes.length).toBe(12);
  });

  it.each(Object.keys(THEME_TABLE))(
    "%s theme has every required color token",
    (themeName) => {
      const theme = THEME_TABLE[themeName as keyof typeof THEME_TABLE];
      for (const field of REQUIRED_FIELDS) {
        expect(theme[field], `${themeName}.${field}`).toBeTruthy();
        expect(typeof theme[field], `${themeName}.${field} should be string`).toBe("string");
      }
    },
  );

  it.each(Object.keys(THEME_TABLE))(
    "%s ctaPrimary includes a background, text color, and hover state",
    (themeName) => {
      const theme = THEME_TABLE[themeName as keyof typeof THEME_TABLE];
      // CtaPrimary is a combined token — must produce a visible button on top of the theme's card.
      // We check for at minimum: a bg-* utility, a text-* utility, and a hover: variant. This
      // catches incomplete copies of the token (e.g. a new theme that forgets the hover state).
      expect(theme.ctaPrimary, `${themeName}.ctaPrimary needs bg-`).toMatch(/\bbg-/);
      expect(theme.ctaPrimary, `${themeName}.ctaPrimary needs text-`).toMatch(/\btext-/);
      expect(theme.ctaPrimary, `${themeName}.ctaPrimary needs hover:`).toMatch(/\bhover:/);
    },
  );

  it("dark theme uses inverted CTA (white on dark) — readability on dark card", () => {
    expect(THEME_TABLE.dark.ctaPrimary).toContain("bg-white");
    expect(THEME_TABLE.dark.ctaPrimary).toContain("text-slate-900");
  });

  it("light themes use dark CTA (near-black) — readability on light card", () => {
    expect(THEME_TABLE.light.ctaPrimary).toContain("bg-slate-900");
    expect(THEME_TABLE.default.ctaPrimary).toContain("bg-slate-900");
  });

  it("brand themes use their accent color (accent / neon)", () => {
    expect(THEME_TABLE.accent.ctaPrimary).toContain("bg-accent-600");
    expect(THEME_TABLE.neon.ctaPrimary).toContain("bg-fuchsia-500");
  });
});
