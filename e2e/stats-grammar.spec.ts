import { expect, test, type Page, type Route } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "gramE2e";
const DAY = 86_400_000;
const seoulDay = (offset: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(Date.now() + offset * DAY);

function stats(overrides: Record<string, unknown> = {}) {
  const base = mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown> & { dailyClicks: { count: number }[] };
  return {
    ...base,
    shortCode: CODE,
    timezone: "Asia/Seoul",
    dailyClicks: base.dailyClicks.map((d, i) => ({ date: seoulDay(i - 29), count: d.count })),
    ...overrides,
  };
}

const EMPTY_LISTS = Object.fromEntries(
  ["dailyClicks", "hourClicks", "heatmap", "referrerClicks", "referrerHostClicks", "channelClicks", "deviceClicks", "osClicks",
    "browserClicks", "botClicks2", "utmCampaignClicks", "utmSourceClicks", "utmMediumClicks", "utmContentClicks", "utmTermClicks",
    "sourceChannelClicks", "clientAppClicks", "fetchSiteClicks", "postClicks", "channelDepth", "countryClicks", "regionClicks",
    "cityClicks", "languageClicks", "asnClicks"].map((key) => [key, []]),
);

const detail = () => ({ ...(mockLinksResponse(`/api/v1/links/${CODE}/detail`, "GET") as Record<string, unknown>), shortCode: CODE, note: "Spring sale" });

async function open(page: Page, hash = "", over: Record<string, (route: Route) => unknown> = {}) {
  await signIn(page);
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/stats`]: (route) => route.fulfill({ json: stats() }),
    [`GET /api/v1/links/${CODE}/detail`]: (route) => route.fulfill({ json: detail() }),
    ...over,
  });
  await page.goto(`/ko/stats/${CODE}${hash}`);
}

test.describe("every stats tab reads in one grammar", () => {
  for (const tab of ["where", "who"]) {
    test(`the ${tab} tab is headings and bar lists, without cards or description lines`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, `#${tab}`);
      const panel = page.locator(`#stats-panel-${tab}`);
      await expect(panel.getByTestId("breakdown-list").first()).toBeVisible();
      await expect(panel.locator(".rounded-2xl")).toHaveCount(0);
      await expect(panel.locator("header")).toHaveCount(0);
      await expect(panel.getByText(/집계|분포$|단위$|\(.*등\)/)).toHaveCount(0);
    });
  }

  test("the who tab opens on one number line instead of four cards", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "#who");
    const kpis = page.locator("#stats-panel-who dl").first();
    await expect(kpis.locator("dt")).toHaveText(["추정 방문자", "방문자당 클릭", "재방문 비율", "미리보기", "피크 시간"]);
  });

  test("a link with no clicks says one line with one action on every tab", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "", {
      [`GET /api/v1/links/${CODE}/stats`]: (route) =>
        route.fulfill({ json: stats({ ...EMPTY_LISTS, totalClicks: 0, humanClicks: 0, botClicks: 0, uniqueClicks: 0, previewClicks: 0 }) }),
    });
    for (const tab of ["overview", "when", "where", "who"]) {
      await page.evaluate((hash) => { location.hash = hash; }, tab);
      const panel = page.locator(`#stats-panel-${tab}`);
      await expect(panel.getByText("아직 클릭이 없어요", { exact: true })).toBeVisible();
      await expect(panel.getByRole("button", { name: "링크 복사" })).toBeVisible();
      await expect(panel.getByTestId("breakdown-list")).toHaveCount(0);
      await expect(panel.getByText("데이터 없음")).toHaveCount(0);
    }
  });

  test("a link reached only by previews shows its numbers and says no person has clicked yet", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "", {
      [`GET /api/v1/links/${CODE}/stats`]: (route) =>
        route.fulfill({ json: stats({ ...EMPTY_LISTS, totalClicks: 6, humanClicks: 0, botClicks: 6, uniqueClicks: 0, previewClicks: 5 }) }),
    });
    const panel = page.locator("#stats-panel-overview");
    await expect(panel.locator("dl").getByText("자동 접속 포함", { exact: true })).toBeVisible();
    await expect(panel.getByText("아직 사람 클릭이 없어요", { exact: true })).toBeVisible();
    await expect(page.getByTestId("daily-chart")).toHaveCount(0);
  });
});

test.describe("the header holds still while the link loads", () => {
  test("detail loads beside stats and the title never shows the raw short URL or pushes the tabs down", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const started: Record<string, number> = {};
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await open(page, "", {
      [`GET /api/v1/links/${CODE}/stats`]: async (route) => {
        started.stats = Date.now();
        await gate;
        return route.fulfill({ json: stats() });
      },
      [`GET /api/v1/links/${CODE}/detail`]: async (route) => {
        started.detail = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return route.fulfill({ json: detail() });
      },
    });
    await expect.poll(() => started.detail !== undefined && started.stats !== undefined).toBe(true);
    release();
    const tabs = page.getByRole("tablist");
    await expect(tabs).toBeVisible();
    const before = (await tabs.boundingBox())!.y;
    await expect(page.locator("main h1")).toHaveCount(0);
    await expect(page.locator("main h1")).toHaveText("Spring sale", { timeout: 10_000 });
    expect((await tabs.boundingBox())!.y).toBe(before);
    await expect(page.locator("main").getByText(/https?:\/\//)).toHaveCount(0);
  });

  test("link settings is a tab, and the dashboard row menu leads to it", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await expect(page.getByRole("tab", { name: "설정", exact: true })).toBeVisible();

    await page.goto("/ko/dashboard");
    const row = page.getByRole("listitem").filter({ hasText: "/spr1ng" }).first();
    await row.getByRole("button", { name: "더보기" }).click();
    await page.getByRole("menuitem", { name: "링크 설정" }).click();
    await expect(page).toHaveURL(/\/stats\/spr1ng#settings$/);
  });
});

test.describe("charts", () => {
  test("today's bar is marked as still counting on the stats and analytics charts", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    const daily = page.getByTestId("daily-chart");
    await expect(daily.locator("[data-partial]")).toHaveCount(1);
    await expect(daily.locator("[data-count]").last()).toHaveAttribute("data-partial", "");

    await mockBackend(page, {
      "GET /api/v1/links/me/overview": (route) =>
        route.fulfill({
          json: {
            totalLinks: 3, totalClicks: 90, humanClicks: 80, clicks7d: 40, previousClicks7d: 30, clicksToday: 4, zeroClickLinks: 0,
            expiringLinks: 0, timezone: "Asia/Seoul", updatedAt: new Date().toISOString(), peak: null,
            dailyClicks: Array.from({ length: 7 }, (_, i) => ({ date: seoulDay(i - 6), count: 4 + i })), topLinks: [], weekTopLinks: [],
          },
        }),
    });
    await page.goto("/ko/analytics");
    const week = page.getByTestId("daily-chart");
    await expect(week.locator("[data-count]")).toHaveCount(7);
    await expect(week.locator("[data-count]").last()).toHaveAttribute("data-partial", "");
    await expect(week).toContainText("오늘");
    await expect(page.locator(".recharts-wrapper")).toHaveCount(0);
  });

  test("the heatmap is one tab stop that arrow keys walk", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "#when");
    const grid = page.getByTestId("heatmap-hours");
    await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
    await grid.locator('button[tabindex="0"]').focus();
    const first = await page.evaluate(() => document.activeElement?.getAttribute("data-cell"));
    await page.keyboard.press("ArrowRight");
    const next = await page.evaluate(() => document.activeElement?.getAttribute("data-cell"));
    expect(next).not.toBe(first);
    expect(next?.split("-")[0]).toBe(first?.split("-")[0]);
  });

  test("journal evidence for speed reads as two numbers, not the hour chart", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page, "", {
      [`GET /api/v1/links/${CODE}/stats`]: (route) =>
        route.fulfill({ json: stats({ velocity: { currentHour: 28, baselinePerHour: 16, ratio: 1.75 } }) }),
    });
    const entry = page.locator("li").filter({ hasText: "지금 평소의 1.8배 속도로 눌리고 있어요" });
    await entry.getByRole("button", { name: /근거/ }).click();
    await expect(entry.locator("dt")).toHaveText(["최근 1시간", "지난 24시간 시간당 평균"]);
    await expect(entry.getByTestId("hour-chart")).toHaveCount(0);
  });
});

test("public stats share the link stats grammar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/public-stats`]: (route) =>
      route.fulfill({ json: stats({ dailyClicks: [{ date: seoulDay(-3), count: 9 }, { date: seoulDay(0), count: 2 }] }) }),
  });
  await page.goto(`/ko/stats/${CODE}/public`);
  await expect(page.locator("main dl").getByText("사람 클릭", { exact: true })).toBeVisible();
  await expect(page.locator("main .rounded-2xl")).toHaveCount(0);
  await expect(page.getByTestId("daily-chart").locator("[data-count]")).toHaveCount(30);
  await expect(page.getByTestId("breakdown-list")).toHaveCount(3);
});
