import { expect, test } from "@playwright/test";
import { ME, mockBackend, signIn } from "./helpers/mock-backend";

test.describe("the 더보기 tab is the hub for tools and settings", () => {
  test("the phone tab lists the tools above the account, and settings keep the tab lit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/dashboard");
    const tabBar = page.locator("nav:visible").filter({ has: page.getByRole("link", { name: "분석", exact: true }) });
    await tabBar.getByRole("link", { name: "더보기", exact: true }).click();

    await expect(page).toHaveURL(/\/ko\/more$/);
    await expect(page.getByRole("heading", { level: 1, name: "더보기" })).toBeVisible();
    const campaigns = page.getByRole("link", { name: /QR 캠페인/ });
    const settings = page.getByRole("link", { name: new RegExp(`설정.*${ME.email}`) });
    await expect(campaigns).toBeVisible();
    await expect(settings).toBeVisible();
    expect((await campaigns.boundingBox())!.y).toBeLessThan((await settings.boundingBox())!.y);
    await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();

    await settings.click();
    await expect(page).toHaveURL(/\/ko\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "설정" })).toBeVisible();
    await expect(page.getByRole("link", { name: /QR 캠페인/ })).toHaveCount(0);
    await expect(tabBar.getByRole("link", { name: "더보기", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("desktop nav names the same hub", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/dashboard");
    await page.getByRole("link", { name: "더보기", exact: true }).first().click();
    await expect(page).toHaveURL(/\/ko\/more$/);
  });
});
