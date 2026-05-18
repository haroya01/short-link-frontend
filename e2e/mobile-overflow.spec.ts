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

const PAGES: { path: string; name: string }[] = [
  { path: "/ko", name: "landing" },
  { path: "/ko/demo", name: "demo" },
  { path: "/ko/showcase", name: "showcase" },
  { path: "/ko/learn", name: "learn" },
  { path: "/ko/pricing", name: "pricing" },
  { path: "/ko/about", name: "about" },
  { path: "/ko/login", name: "login" },
  { path: "/ko/terms", name: "terms" },
  { path: "/ko/privacy", name: "privacy" },
];

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
 * The heatmap on {@code /ko/demo} is the smoking gun that caused issue #222 — its
 * {@code min-w-[640px]} grid lives inside an {@code overflow-x-auto} wrapper so it can scroll
 * sideways on narrow screens. When the fix lands we must keep the internal horizontal scroll
 * (the chart genuinely needs 640px to show 24 hour columns), only stop it from pushing the
 * page body wider than the viewport. This separate check guards the {@code overflow-x-auto}
 * contract isn't accidentally regressed (e.g. by replacing {@code min-w-[640px]} with
 * {@code w-full} which would visually collapse the chart).
 */
test.describe("heatmap internal horizontal scroll preserved", () => {
  test.use({ viewport: { width: 375, height: 667 } });
  test("heatmap on /ko/demo has internal scrollWidth > clientWidth", async ({ page }) => {
    await page.goto("/ko/demo");
    await page.waitForLoadState("networkidle");
    const dims = await page.evaluate(() => {
      const grid = document.querySelector('[class*="grid-cols-[36px_repeat"]');
      const inner = grid?.parentElement;
      const wrap = inner?.parentElement;
      return wrap
        ? { clientWidth: wrap.clientWidth, scrollWidth: wrap.scrollWidth }
        : null;
    });
    expect(dims).not.toBeNull();
    expect(dims!.scrollWidth).toBeGreaterThan(dims!.clientWidth);
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
