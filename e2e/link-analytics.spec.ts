import { expect, test } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

function link(shortCode: string, note: string, week: number[], human: number) {
  return {
    shortCode,
    shortUrl: `https://kurl.me/${shortCode}`,
    originalUrl: `https://example.com/${shortCode}`,
    createdAt: "2026-08-01T00:00:00Z",
    expiresAt: null,
    clickCount: human + 10,
    humanClickCount: human,
    tags: [],
    clicksLast7d: week,
    note,
    timezone: "Asia/Seoul",
  };
}

function overview(extra: Record<string, unknown> = {}) {
  return {
    totalLinks: 3,
    totalClicks: 900,
    humanClicks: 800,
    clicks7d: 112,
    previousClicks7d: 100,
    clicksToday: 9,
    zeroClickLinks: 0,
    expiringLinks: 0,
    timezone: "Asia/Seoul",
    updatedAt: "2026-09-28T10:00:00Z",
    dailyClicks: ["09-22", "09-23", "09-24", "09-25", "09-26", "09-27", "09-28"].map((day, i) => ({
      date: `2026-${day}`,
      count: [10, 12, 14, 16, 18, 20, 22][i],
    })),
    peak: { dayOfWeek: 4, hour: 21, clicks: 30 },
    topLinks: [link("old01", "Old campaign", [0, 0, 0, 0, 0, 0, 0], 700)],
    weekTopLinks: [link("hot01", "This week post", [10, 12, 14, 16, 18, 20, 22], 112)],
    ...extra,
  };
}

async function openWith(page: import("@playwright/test").Page, body: object) {
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/links/me/overview": (route) => route.fulfill({ json: body }),
  });
  await page.goto("/ko/analytics");
}

test.describe("analytics is one page about the last 7 days", () => {
  test("the headline compares with the 7 days before and the list ranks the week, not all time", async ({ page }) => {
    await openWith(page, overview());
    await expect(page.getByText("그 전 7일보다 12% 늘었어요(100회)")).toBeVisible();
    await expect(page.getByText("가장 많이 누른 때 수요일 오후 9시")).toBeVisible();
    await expect(page.getByRole("heading", { name: "최근 7일 많이 클릭된 링크" })).toBeVisible();
    await expect(page.getByRole("link", { name: /This week post/ })).toContainText("112");
    await expect(page.getByText("Old campaign")).toHaveCount(0);
    await expect(page.getByText("지난 7일 인사이트")).toHaveCount(0);
  });

  test("a quiet week says so instead of an empty list, and a lone click is not called a peak", async ({ page }) => {
    await openWith(
      page,
      overview({ clicks7d: 1, previousClicks7d: 0, weekTopLinks: [], peak: { dayOfWeek: 2, hour: 9, clicks: 1 } }),
    );
    await expect(page.getByText("그 전 7일엔 클릭이 없었어요")).toBeVisible();
    await expect(page.getByText("최근 7일엔 아직 클릭이 없어요.")).toBeVisible();
    await expect(page.getByText(/가장 많이 누른 때/)).toHaveCount(0);
  });
});
