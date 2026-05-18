import { expect, test } from "@playwright/test";

/**
 * Heatmap responsive contract.
 *
 * 모바일 (< md, viewport ≤ 414): 4h aggregate → 6 cols × 7 rows = 42 cells, 한 화면에 들어와야 함
 * (가로 스크롤 없음). 사용자 보고: 24h × 7day 가 옆으로 밀어야 보여서 "어느 시간대 비어있는지"
 * 즉시 안 보였다.
 *
 * 데스크탑 (≥ md): 정확도 우선 — 24 cols × 7 rows = 168 hourly cells 유지.
 *
 * 이 spec 은 demo 페이지의 heatmap 에 대해 두 viewport 클래스를 모두 검증한다. demo 는 인증 없이
 * 접근 가능한 유일한 heatmap 노출 페이지라 e2e 에서 쓰기 좋다.
 */

const MOBILE_VIEWPORTS = [
  { name: "iPhone SE 375", width: 375, height: 667 },
  { name: "iPhone 14 Plus 414", width: 414, height: 896 },
] as const;

const DESKTOP_VIEWPORTS = [
  { name: "laptop 1280", width: 1280, height: 720 },
  { name: "desktop 1920", width: 1920, height: 1080 },
] as const;

const MOBILE_GRID_SELECTOR = '[class*="grid-cols-[36px_repeat(6"]';
const DESKTOP_GRID_SELECTOR = '[class*="grid-cols-[36px_repeat(24"]';

test.describe("heatmap mobile aggregate (4h × 7day)", () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test.describe(`${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("renders 6-col mobile grid and hides desktop grid", async ({ page }) => {
        await page.goto("/ko/demo");
        await page.waitForLoadState("networkidle");

        const mobileGrid = page.locator(MOBILE_GRID_SELECTOR).first();
        const desktopGrid = page.locator(DESKTOP_GRID_SELECTOR).first();

        await expect(mobileGrid).toBeVisible();
        // Desktop grid is in the DOM but hidden via md:hidden parent.
        await expect(desktopGrid).toBeHidden();
      });

      test("fits viewport width without horizontal scroll", async ({ page }) => {
        await page.goto("/ko/demo");
        await page.waitForLoadState("networkidle");

        const dims = await page.evaluate((sel) => {
          const grid = document.querySelector(sel) as HTMLElement | null;
          if (!grid) return null;
          const rect = grid.getBoundingClientRect();
          return { width: rect.width, vw: window.innerWidth };
        }, MOBILE_GRID_SELECTOR);

        expect(dims).not.toBeNull();
        expect(dims!.width).toBeLessThanOrEqual(dims!.vw + 1);
      });

      test("renders 42 cells (6 cols × 7 rows)", async ({ page }) => {
        await page.goto("/ko/demo");
        await page.waitForLoadState("networkidle");

        const cellCount = await page.evaluate((sel) => {
          const grid = document.querySelector(sel) as HTMLElement | null;
          if (!grid) return -1;
          return grid.querySelectorAll("button").length;
        }, MOBILE_GRID_SELECTOR);

        expect(cellCount).toBe(42);
      });
    });
  }
});

test.describe("heatmap desktop full grid (24h × 7day)", () => {
  for (const vp of DESKTOP_VIEWPORTS) {
    test.describe(`${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("renders 24-col desktop grid and hides mobile grid", async ({ page }) => {
        await page.goto("/ko/demo");
        await page.waitForLoadState("networkidle");

        const mobileGrid = page.locator(MOBILE_GRID_SELECTOR).first();
        const desktopGrid = page.locator(DESKTOP_GRID_SELECTOR).first();

        await expect(desktopGrid).toBeVisible();
        await expect(mobileGrid).toBeHidden();
      });

      test("renders 168 hourly cells (24 cols × 7 rows)", async ({ page }) => {
        await page.goto("/ko/demo");
        await page.waitForLoadState("networkidle");

        const cellCount = await page.evaluate((sel) => {
          const grid = document.querySelector(sel) as HTMLElement | null;
          if (!grid) return -1;
          return grid.querySelectorAll("button").length;
        }, DESKTOP_GRID_SELECTOR);

        expect(cellCount).toBe(168);
      });
    });
  }
});

/**
 * Aggregate correctness: each mobile cell's aria-label count must equal the sum of the four
 * hourly cells it covers on the desktop grid. We compare counts by parsing the localized
 * aria-label "{day} {h}시 — {count}회" → count = parseInt last number.
 *
 * 두 grid 가 같은 데이터(`data.heatmap`)로 렌더되므로, viewport 만 바꿔도 비교 가능. 첫 round 는
 * 데스크탑 viewport 로 hourly 합을 수집, 두 번째 round 는 모바일 viewport 로 4h aggregate 값을 읽고
 * 비교한다.
 */
test.describe("heatmap aggregate correctness — mobile bucket = desktop 4h sum", () => {
  test("mobile 4h bucket count equals desktop hourly sum per (day, bucket)", async ({ page }) => {
    function parseCount(label: string | null): number {
      if (!label) return -1;
      // ko: "{day} {hour}시 — {count}회"  or "{day} {from}–{to}시 — {count}회"
      const m = label.match(/—\s*(\d+)\s*회/);
      return m ? Number(m[1]) : -1;
    }

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/ko/demo");
    await page.waitForLoadState("networkidle");

    const desktopCounts = await page.evaluate(
      ({ sel }) => {
        const grid = document.querySelector(sel) as HTMLElement | null;
        if (!grid) return null;
        const labels: string[] = [];
        grid.querySelectorAll("button").forEach((btn) => {
          labels.push(btn.getAttribute("aria-label") ?? "");
        });
        return labels;
      },
      { sel: DESKTOP_GRID_SELECTOR },
    );

    expect(desktopCounts).not.toBeNull();
    expect(desktopCounts!.length).toBe(168);

    const hourlyByRow: number[][] = [];
    for (let row = 0; row < 7; row += 1) {
      const slice = desktopCounts!.slice(row * 24, row * 24 + 24).map(parseCount);
      hourlyByRow.push(slice);
    }
    const expectedBuckets: number[][] = hourlyByRow.map((hours) => {
      const buckets: number[] = [];
      for (let b = 0; b < 6; b += 1) {
        let s = 0;
        for (let i = 0; i < 4; i += 1) s += hours[b * 4 + i] ?? 0;
        buckets.push(s);
      }
      return buckets;
    });

    await page.setViewportSize({ width: 375, height: 667 });
    // Allow the responsive switch to settle.
    await page.waitForTimeout(150);
    const mobileCounts = await page.evaluate(
      ({ sel }) => {
        const grid = document.querySelector(sel) as HTMLElement | null;
        if (!grid) return null;
        const labels: string[] = [];
        grid.querySelectorAll("button").forEach((btn) => {
          labels.push(btn.getAttribute("aria-label") ?? "");
        });
        return labels;
      },
      { sel: MOBILE_GRID_SELECTOR },
    );

    expect(mobileCounts).not.toBeNull();
    expect(mobileCounts!.length).toBe(42);

    const actualBuckets: number[][] = [];
    for (let row = 0; row < 7; row += 1) {
      actualBuckets.push(mobileCounts!.slice(row * 6, row * 6 + 6).map(parseCount));
    }

    expect(actualBuckets).toEqual(expectedBuckets);
  });
});
