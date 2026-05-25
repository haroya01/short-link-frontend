import { expect, test } from "@playwright/test";

/**
 * Regression guard for issue #222 — iPhone Safari kurl.me 랜딩에서 좌우 스와이프가 가능했고
 * 우측에 viewport 의 60-70% 빈 여백이 생겼다. 원인은 페이지 안의 어떤 element 가 viewport
 * (375 / 414px) 보다 넓어 {@code documentElement.scrollWidth} 가 viewport width 를 초과하는
 * 것. 이 spec 은 주요 페이지를 모바일 viewport 로 열고 horizontal overflow 가 없는지 검증한다.
 *
 * 실패 시 {@link findOffenders} 가 viewport 를 벗어나는 element 들을 console 로 dump 해 디버깅을
 * 돕는다.
 */

const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPhone 14 Plus", width: 414, height: 896 },
] as const;

const LOCALES = ["ko", "en", "ja"] as const;

const ROUTES: { path: string; name: string }[] = [
  { path: "", name: "landing" },
  { path: "/demo", name: "demo" },
  { path: "/showcase", name: "showcase" },
  { path: "/learn", name: "learn" },
  { path: "/pricing", name: "pricing" },
  { path: "/about", name: "about" },
  { path: "/login", name: "login" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
];

const PAGES: { path: string; name: string }[] = LOCALES.flatMap((locale) =>
  ROUTES.map((route) => ({
    path: `/${locale}${route.path}`,
    name: `${route.name} ${locale}`,
  })),
);

test.describe("mobile horizontal overflow", () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test.describe(`viewport ${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const { path, name } of PAGES) {
        test(`${name} (${path}) — scrollWidth <= viewport width`, async ({ page }) => {
          await page.goto(path);
          await page.waitForLoadState("networkidle");

          const { scrollWidth, clientWidth, innerWidth } = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            innerWidth: window.innerWidth,
          }));

          if (scrollWidth > innerWidth + 1) {
            // Dump offenders so we can pinpoint which element pushed past the viewport.
            const offenders = await findOffenders(page);
            // eslint-disable-next-line no-console
            console.error(
              `[mobile-overflow] ${name} @ ${vp.width}px — scrollWidth ${scrollWidth} > inner ${innerWidth}, offenders:`,
              JSON.stringify(offenders, null, 2),
            );
          }

          // 1px tolerance for sub-pixel rounding on rare engines.
          expect(scrollWidth, `${name}: documentElement.scrollWidth`).toBeLessThanOrEqual(
            innerWidth + 1,
          );
          expect(clientWidth).toBeLessThanOrEqual(innerWidth + 1);
        });
      }
    });
  }
});

/**
 * 모바일에서 heatmap 은 4h aggregate 로 한 화면에 fit 한다 (6 cols × 7 rows). 이전엔 24 cols 가
 * {@code overflow-x-auto} 안에서 옆으로 스크롤됐는데 사용자가 "어느 시간대 비어있는지 즉시" 보려고
 * 했을 때 swipe 가 막혀 의도가 죽었다. 이 spec 은 모바일 viewport 에서 heatmap 의 표시 grid 가
 * 가로 스크롤 없이 viewport 안에 들어오는지 검증한다 (데스크탑 24h 검증은 e2e/heatmap-responsive
 * 에서).
 */
test.describe("heatmap mobile fits viewport without horizontal scroll", () => {
  test.use({ viewport: { width: 375, height: 667 } });
  test("heatmap on /ko/demo: mobile grid <= viewport width", async ({ page }) => {
    await page.goto("/ko/demo");
    await page.waitForLoadState("networkidle");
    const dims = await page.evaluate(() => {
      // The mobile heatmap uses the 6-bucket grid template.
      const grid = document.querySelector('[class*="grid-cols-[36px_repeat(6"]');
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      return { width: rect.width, viewport: window.innerWidth };
    });
    expect(dims).not.toBeNull();
    // The grid itself must not exceed viewport width (1px sub-pixel tolerance).
    expect(dims!.width).toBeLessThanOrEqual(dims!.viewport + 1);
  });
});

async function findOffenders(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const out: { tag: string; cls: string; right: number; width: number }[] = [];
    const all = document.querySelectorAll<HTMLElement>("*");
    for (const el of Array.from(all)) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0) {
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.toString() ?? "").slice(0, 120),
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
        if (out.length >= 20) break;
      }
    }
    return out;
  });
}
