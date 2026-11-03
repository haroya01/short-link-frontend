import { expect, test, type Page } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "nameE2e";
const DAY = 86_400_000;

function seoulDay(offset: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(Date.now() + offset * DAY);
}

function tomorrowNoonSeoul() {
  return new Date(`${seoulDay(1)}T12:00:00+09:00`).toISOString();
}

function stats(overrides: Record<string, unknown> = {}) {
  const base = mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>;
  return {
    ...base,
    shortCode: CODE,
    timezone: "Asia/Seoul",
    botClicks2: [
      { bot: "preview:kakaotalk-scrap", count: 9 },
      { bot: "datacenter:Amazon.com, Inc.", count: 4 },
      { bot: "rate-flood", count: 2 },
    ],
    languageClicks: [{ language: "ja", count: 40 }],
    channelClicks: [{ channel: "messaging", count: 30 }, { channel: "direct", count: 20 }],
    sourceChannelClicks: [{ source: "profile-dohyun", count: 12 }],
    ...overrides,
  };
}

function detail(overrides: Record<string, unknown> = {}) {
  return {
    ...(mockLinksResponse(`/api/v1/links/${CODE}/detail`, "GET") as Record<string, unknown>),
    shortCode: CODE,
    note: null,
    ogTitle: "봄 신상 린넨 셔츠",
    ...overrides,
  };
}

async function openStats(page: Page, hash = "", over: Record<string, unknown> = {}, detailOver: Record<string, unknown> = {}) {
  await signIn(page);
  await mockBackend(page, {
    [`GET /api/v1/links/${CODE}/stats`]: (route) => route.fulfill({ json: stats(over) }),
    [`GET /api/v1/links/${CODE}/detail`]: (route) => route.fulfill({ json: detail(detailOver) }),
  });
  await page.goto(`/ko/stats/${CODE}${hash}`);
  await expect(page.locator("main h1")).toHaveText("봄 신상 린넨 셔츠");
}

test.describe("one name per number, people's words for stored values", () => {
  test("the who tab names automated visits by kind and service, never by stored prefix", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStats(page, "#who");
    const panel = page.locator("#stats-panel-who");
    await expect(panel.getByText("미리보기 · 카카오톡", { exact: true })).toBeVisible();
    await expect(panel.getByText("데이터센터 · Amazon.com, Inc.", { exact: true })).toBeVisible();
    await expect(panel.getByText("짧은 시간 반복 접속", { exact: true })).toBeVisible();
    await expect(panel.getByText("일본어", { exact: true })).toBeVisible();
    await expect(panel.getByText(/preview:|datacenter:|rate-flood/)).toHaveCount(0);
    await expect(panel.locator("dt").getByText("미리보기", { exact: true })).toBeVisible();
    await expect(panel.getByText("방문자당 클릭", { exact: true })).toBeVisible();
    await expect(panel.getByText(/유니크|실제 \/|프리뷰/)).toHaveCount(0);
  });

  test("the where tab spells out channels and profile sources", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStats(page, "#where");
    const panel = page.locator("#stats-panel-where");
    const section = (title: string) => panel.locator("section").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(section("채널").getByTestId("breakdown-name")).toHaveText(["메신저", "직접 유입"]);
    await expect(section("공유 채널").getByTestId("breakdown-name")).toHaveText(["프로필 @dohyun"]);
  });

  test("the total that includes automated visits says so in its own name", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStats(page);
    const kpis = page.locator("#stats-panel-overview dl");
    await expect(kpis.getByText("사람 클릭", { exact: true })).toBeVisible();
    await expect(kpis.getByText("자동 접속 포함", { exact: true })).toBeVisible();
    await expect(page.getByText("누적 전체 클릭")).toHaveCount(0);
  });

  test("the stats header and the dashboard row name the link and its expiry the same way", async ({ page }) => {
    const expiresAt = tomorrowNoonSeoul();
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStats(page, "", {}, { expiresAt, passwordProtected: true });
    const header = page.locator("main h1 + p");
    await expect(header.getByText("만료 D-1", { exact: true })).toBeVisible();
    await expect(header.getByText("비밀번호", { exact: true })).toBeVisible();

    await mockBackend(page, {
      "GET /api/v1/links/me": (route) =>
        route.fulfill({
          json: {
            items: [{
              shortCode: CODE, shortUrl: `https://kurl.me/${CODE}`, originalUrl: "https://blog.example.com/a", note: null,
              ogTitle: "봄 신상 린넨 셔츠", createdAt: "2026-09-01T00:00:00Z", expiresAt, clickCount: 3, humanClickCount: 3,
              clicksLast7d: [0, 0, 0, 0, 0, 0, 1], tags: [], timezone: "Asia/Seoul",
            }],
            hasMore: false,
            nextCursor: null,
          },
        }),
    });
    await page.goto("/ko/dashboard");
    const desktopRow = page.locator("li").filter({ hasText: `/${CODE}` }).locator(":scope > div").last();
    await expect(desktopRow.getByText("봄 신상 린넨 셔츠", { exact: true })).toBeVisible();
    await expect(desktopRow.getByText("만료 D-1", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const phoneRow = page.locator("li").filter({ hasText: `/${CODE}` }).locator(":scope > div").first();
    await expect(phoneRow.getByText("만료 D-1", { exact: true })).toBeVisible();
  });

  test("the log reads in the owner's time zone and in people's words", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await mockBackend(page, {
      [`GET /api/v1/links/${CODE}/stats`]: (route) => route.fulfill({ json: stats({ timezone: "America/New_York" }) }),
      [`GET /api/v1/links/${CODE}/detail`]: (route) => route.fulfill({ json: detail() }),
      [`GET /api/v1/links/${CODE}/events`]: (route) =>
        route.fulfill({
          json: {
            items: [{
              clickedAt: "2026-10-21T11:00:00Z", country: "JP", region: null, city: "Osaka", device: "mobile", os: "iOS",
              browser: "Safari", referrer: null, referrerHost: null, channel: "direct", language: "ja", bot: false,
              botName: null, ipMasked: null,
            }],
            nextCursor: null,
          },
        }),
    });
    await page.goto(`/ko/stats/${CODE}#log`);
    const row = page.locator("#stats-panel-log tbody tr").first();
    await expect(row).toHaveText(/2026\.10\.21 07:00:00\s*Osaka, 일본\s*모바일 · iOS · Safari\s*직접 유입/);
    await expect(page.locator("#stats-panel-log").getByText("America/New_York", { exact: true })).toBeVisible();
  });
});

test.describe("campaign numbers keep one unit and every day", () => {
  const campaign = {
    id: 7, name: "신주쿠 포스터", status: "ACTIVE", startsAt: new Date(`${seoulDay(-6)}T00:00:00+09:00`).toISOString(),
    endsAt: new Date(Date.now() + 30 * DAY).toISOString(), endedAt: null, defaultDestinationUrl: null, postEndAction: "KEEP",
    postEndDestinationUrl: null, postEndMessage: null, batchCount: 2, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
  };
  const campaignStats = {
    totalClicks: 151, testScans: 0, lastTestScanAt: null,
    byBatch: [
      { batchId: 1, batchName: "역 앞", distributor: "A", area: "Shinjuku", quantity: 500, shortCode: "q1", clicks: 142 },
      { batchId: 2, batchName: "공원", distributor: "B", area: "Yoyogi", quantity: 200, shortCode: "q2", clicks: 9 },
    ],
    byDistributor: [],
    byArea: [
      { key: "Shinjuku", clicks: 142, totalQuantity: 500, clickRatePerHundred: 28.4 },
      { key: "Yoyogi", clicks: 9, totalQuantity: 200, clickRatePerHundred: 4.5 },
    ],
    byHour: [{ hour: 9, clicks: 151 }],
    byDay: [{ day: seoulDay(-5), clicks: 100 }, { day: seoulDay(-1), clicks: 51 }],
    heatmap: [],
  };

  test("efficiency reads as 100장당 N회 everywhere and the daily chart keeps idle days", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await mockBackend(page, {
      "GET /api/v1/campaigns/7": (route) => route.fulfill({ json: campaign }),
      "GET /api/v1/campaigns/7/stats": (route) => route.fulfill({ json: campaignStats }),
      "GET /api/v1/campaigns/7/recommendations": (route) =>
        route.fulfill({ json: { insufficient: true, insufficientReason: "", totalQuantity: 700, totalClicks: 151, avgRatePerHundred: 21.6, recommendations: [] } }),
      "GET /api/v1/campaigns": (route) => route.fulfill({ json: [] }),
    });
    await page.goto("/ko/campaigns/7/stats");
    const main = page.locator("main");
    await expect(main.getByText("사람 클릭", { exact: true }).first()).toBeVisible();
    await expect(main.getByText("/ 500장 · 100장당 28.4회", { exact: true })).toBeVisible();
    await expect(main.getByText("100장당 28.4회", { exact: true })).toBeVisible();
    await expect(main.getByText(/\d%/)).toHaveCount(0);
    await expect(page.getByTestId("daily-chart").locator("[data-count]")).toHaveCount(7);
    await expect(main.getByText("캠페인 시작 이후 · Asia/Seoul", { exact: true })).toBeVisible();
  });
});
