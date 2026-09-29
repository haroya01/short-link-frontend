import { expect, test } from "@playwright/test";
import { mockLinksResponse } from "../lib/api/_links-mocks";
import { mockBackend, signIn } from "./helpers/mock-backend";

const CODE = "e2eStat";
const demoStats = () => mockLinksResponse(`/api/v1/links/${CODE}/stats`, "GET") as Record<string, unknown>;

test.describe("stats page", () => {
  test("shows empty state when no clicks", async ({ page }) => {
    await signIn(page);
    await mockBackend(page, {
      [`GET /api/v1/links/${CODE}/stats`]: (route) =>
        route.fulfill({ json: { ...demoStats(), totalClicks: 0, humanClicks: 0, uniqueClicks: 0, botClicks: 0 } }),
    });
    await page.goto(`/ko/stats/${CODE}`);
    await expect(page.getByText("아직 클릭이 없어요", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "복사", exact: true })).toHaveCount(1);
  });

  test("shows totals when clicks exist", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto(`/ko/stats/${CODE}`);
    await expect(page.getByText("누적 전체 클릭", { exact: true })).toBeVisible();
    await expect(page.getByText("주목할 변화", { exact: true })).toBeVisible();
    await expect(page.getByText("실시간 클릭").first()).toBeVisible();
  });

  test("public toggle flips visibility and the public route renders without sign-in", async ({ page, browser }) => {
    let statsPublic = false;
    await signIn(page);
    await mockBackend(page, {
      [`PATCH /api/v1/links/${CODE}/visibility`]: (route) => {
        statsPublic = JSON.parse(route.request().postData() ?? "{}").statsPublic;
        return route.fulfill({ json: { shortCode: CODE, statsPublic } });
      },
    });
    await page.goto(`/ko/stats/${CODE}`);
    const publicSwitch = page.getByRole("switch", { name: "통계 공개" });
    await expect(publicSwitch).toHaveAttribute("aria-checked", "false");
    await publicSwitch.click();
    await expect(publicSwitch).toHaveAttribute("aria-checked", "true");
    expect(statsPublic).toBe(true);

    const visitor = await browser.newPage();
    await visitor.route(`**/api/v1/links/${CODE}/public-stats`, (route) => route.fulfill({ json: demoStats() }));
    await visitor.route("**/api/v1/**", (route) => route.fallback());
    await visitor.goto(`/ko/stats/${CODE}/public`);
    await expect(visitor.getByText(/공개 통계/).first()).toBeVisible();
    await visitor.close();
  });
});
