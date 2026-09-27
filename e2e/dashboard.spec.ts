import { expect, test, type Page } from "@playwright/test";
import { mockBackend, signIn } from "./helpers/mock-backend";

const LONG_URL =
  "https://docs.example-service.io/guides/getting-started/installation-and-configuration?utm_source=newsletter&utm_campaign=aug";

function link(shortCode: string, originalUrl: string, note: string | null = null) {
  return {
    shortCode,
    shortUrl: `https://kurl.me/${shortCode}`,
    originalUrl,
    note,
    createdAt: "2026-09-01T00:00:00Z",
    expiresAt: null,
    clickCount: 3,
    humanClickCount: 3,
    clicksLast7d: [0, 0, 1, 0, 1, 0, 1],
    tags: [],
    timezone: "Asia/Seoul",
  };
}

async function withLinks(page: Page, rows: ReturnType<typeof link>[]) {
  await signIn(page);
  await mockBackend(page, {
    "GET /api/v1/links/me": (route) => {
      const q = new URL(route.request().url()).searchParams.get("q")?.toLowerCase();
      const items = rows.filter((r) => !q || `${r.note} ${r.shortCode} ${r.originalUrl}`.toLowerCase().includes(q));
      return route.fulfill({ json: { items, hasMore: false, nextCursor: null } });
    },
    "GET /api/v1/links/me/favorites": (route) => route.fulfill({ json: { items: [], hasMore: false, nextCursor: null } }),
    "GET /api/v1/links/me/overview": (route) =>
      route.fulfill({
        json: {
          humanClicks: 0, totalLinks: rows.length, totalClicks: 0, clicks7d: 0, clicksToday: 0, zeroClickLinks: 0,
          expiringLinks: 0, timezone: "Asia/Seoul", updatedAt: "2026-09-23T00:00:00Z", dailyClicks: [], topLinks: [],
        },
      }),
  });
}

const row = (page: Page, code: string) => page.getByRole("listitem").filter({ has: page.getByRole("checkbox", { name: `/${code} 선택` }) });

test.describe("dashboard (auth)", () => {
  test("lists the viewer's own links", async ({ page }) => {
    await withLinks(page, [link("dash1", "https://example.com/dash-1"), link("dash2", "https://example.com/dash-2")]);
    await page.goto("/ko/dashboard");
    await expect(page.getByRole("heading", { name: /내 링크/ })).toBeVisible();
    await expect(row(page, "dash1")).toBeVisible();
    await expect(row(page, "dash2")).toBeVisible();
  });

  test("search filters by original URL", async ({ page }) => {
    await withLinks(page, [link("findA", "https://findme.example.com/A"), link("othrB", "https://other.example.com/B")]);
    await page.goto("/ko/dashboard");
    await page.getByPlaceholder(/원본 URL 또는 짧은 코드/).fill("findme");
    await expect(row(page, "findA")).toBeVisible();
    await expect(row(page, "othrB")).toHaveCount(0);
  });

  test("a long original URL never pushes the page sideways", async ({ page }) => {
    await withLinks(page, [link("longU", LONG_URL)]);
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto("/ko/dashboard");
    await expect(row(page, "longU")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("delete removes the link from the list", async ({ page }) => {
    const rows = [link("delMe", "https://example.com/del-target"), link("keep1", "https://example.com/keep")];
    const deleted: string[] = [];
    await withLinks(page, rows);
    await page.route("**/api/v1/links/delMe", (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      deleted.push("delMe");
      rows.splice(0, 1);
      return route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/ko/dashboard");
    await row(page, "delMe").getByRole("button", { name: "더보기" }).click();
    await page.getByRole("menuitem", { name: "삭제" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
    await expect(row(page, "delMe")).toHaveCount(0);
    await expect(row(page, "keep1")).toBeVisible();
    expect(deleted).toEqual(["delMe"]);
  });
});
