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
  "divider",
  "rowHover",
  "accentText",
  "accentBorder",
  "pageBgHex",
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

  // 테마 = 색 종이 한 장 + 강조색 하나. 주 버튼과 이니셜 원은 같은 강조색 계열이어야 한다.
  it.each(Object.keys(THEME_TABLE))("%s uses one accent for the button and the avatar", (themeName) => {
    const theme = THEME_TABLE[themeName as keyof typeof THEME_TABLE];
    const hue = (cls: string) => /(?:^|\s)bg-([a-z]+)(?:-\d+)?(?:\/\d+)?(?=\s|$)/.exec(cls)?.[1];
    expect(hue(theme.ctaPrimary), `${themeName}.ctaPrimary`).toBeTruthy();
    expect(hue(theme.ctaPrimary)).toBe(hue(theme.avatar));
  });

  // 페이지와 카드는 평평한 종이 — 그라디언트·움직이는 배경·흐림·글로우를 다시 들이지 않는다.
  it.each(Object.keys(THEME_TABLE))("%s page and cards stay flat paper", (themeName) => {
    const theme = THEME_TABLE[themeName as keyof typeof THEME_TABLE];
    const surface = [theme.page, theme.card, theme.cardBorder, theme.cardHover, theme.avatar].join(" ");
    expect(surface).not.toMatch(/gradient|-anim|backdrop-blur|shadow-\[/);
  });

  it("keeps the default theme's text ink (the contact card reads mono from text-black)", () => {
    expect(THEME_TABLE.default.primary).not.toBe("text-black");
    expect(THEME_TABLE.mono.primary).toBe("text-black");
  });
});
