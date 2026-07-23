import { expect, test } from "@playwright/test";
import { signInAs, uniqueEmail } from "./helpers/auth";
import { createLink } from "./helpers/links";

test.describe("stats page", () => {
  test("shows empty state when no clicks", async ({ page, context }) => {
    const email = uniqueEmail("stats-empty");
    const token = await signInAs(page, context, email);
    const link = await createLink(context.request, "https://example.com/stats-empty", token);

    await page.goto(`/ko/stats/${link.shortCode}`);
    await expect(page.getByText(/아직 클릭이 없어요/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/단축 링크 복사/)).toBeVisible();
  });

  test("shows totals after clicks happen", async ({ page, context }) => {
    const email = uniqueEmail("stats-totals");
    const token = await signInAs(page, context, email);
    const link = await createLink(context.request, "https://example.com/stats-totals", token);
    // simulate two clicks via direct redirect
    await context.request.get(`/${link.shortCode}`, { maxRedirects: 0 });
    await context.request.get(`/${link.shortCode}`, { maxRedirects: 0 });

    await page.goto(`/ko/stats/${link.shortCode}`);
    await expect(page.getByText("총 클릭")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("링크 일지")).toBeVisible();
    await expect(page.getByRole("button", { name: "누가" })).toBeVisible();
  });

  test("public toggle exposes /public route", async ({ page, context }) => {
    const email = uniqueEmail("stats-public");
    const token = await signInAs(page, context, email);
    const link = await createLink(context.request, "https://example.com/stats-public", token);

    await page.goto(`/ko/stats/${link.shortCode}`);
    await page.getByRole("button", { name: /통계 공개로 전환/ }).click();
    await expect(page.getByRole("button", { name: /통계 비공개로 전환/ })).toBeVisible({
      timeout: 5000,
    });

    // Verify public route accessible without auth
    await page.context().clearCookies();
    await page.evaluate(() => window.localStorage.removeItem("short-link:access-token"));
    await page.goto(`/ko/stats/${link.shortCode}/public`);
    await expect(page.getByText(/공개 통계/)).toBeVisible();
    await expect(page.getByText(/공개$/)).toBeVisible();
  });
});
