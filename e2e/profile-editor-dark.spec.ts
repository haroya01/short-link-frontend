import { expect, test, type Locator } from "@playwright/test";

// mock-on 레인: 목 사용자 @dohyun 의 프로필 편집기. 목 피드는 비어 있고 고를 수 있는 링크는 라벨이 없다.
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "kurl_theme", value: "dark", domain: "localhost", path: "/" }]);
});

async function contrast(locator: Locator): Promise<number> {
  return locator.evaluate((el) => {
    const parse = (c: string) => {
      const p = c.match(/rgba?\(([^)]+)\)/)![1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const layers = [];
    for (let e: Element | null = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let bg = parse(getComputedStyle(document.body).backgroundColor);
    for (const l of layers.reverse()) {
      bg = { r: l.r * l.a + bg.r * (1 - l.a), g: l.g * l.a + bg.g * (1 - l.a), b: l.b * l.a + bg.b * (1 - l.a), a: 1 };
    }
    const fg = lum(parse(getComputedStyle(el).color));
    const back = lum(bg);
    return (Math.max(fg, back) + 0.05) / (Math.min(fg, back) + 0.05);
  });
}

test("dark profile editor keeps the bio, the first-link card and label buttons readable", async ({ page }) => {
  await page.goto("/ko/settings/profile");
  await expect(page.locator("html")).toHaveClass(/dark/);

  const bio = page.getByRole("textbox", { name: /한 줄 소개/ });
  await expect(bio).toHaveValue(/\S/);
  expect(await contrast(bio)).toBeGreaterThanOrEqual(4.5);

  const firstLink = page.getByText("첫 링크 추가", { exact: true });
  await expect(firstLink).toBeVisible();
  expect(await contrast(firstLink)).toBeGreaterThanOrEqual(4.5);

  const label = page.getByRole("button", { name: /라벨 추가/ }).first();
  await expect(label).toBeVisible();
  expect(await contrast(label)).toBeGreaterThanOrEqual(4.5);
});
