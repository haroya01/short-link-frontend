import { expect, test } from "@playwright/test";
import { ME, mockBackend, signIn } from "./helpers/mock-backend";

test.describe("QR 캠페인 and 모집 are main features after sign-in", () => {
  test("the phone tab bar opens them directly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/dashboard");
    const tabBar = page.locator("nav:visible").filter({ has: page.getByRole("link", { name: "분석", exact: true }) });

    await tabBar.getByRole("link", { name: "QR 캠페인", exact: true }).click();
    await expect(page).toHaveURL(/\/ko\/campaigns$/);
    await expect(tabBar.getByRole("link", { name: "QR 캠페인", exact: true })).toHaveAttribute("aria-current", "page");

    await tabBar.getByRole("link", { name: "모집", exact: true }).click();
    await expect(page).toHaveURL(/\/ko\/events$/);
    await expect(tabBar.getByRole("link", { name: "모집", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("the desktop nav lists them between 링크 and 분석", async ({ page }) => {
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/dashboard");
    const nav = page.locator("header nav:visible");
    await expect(nav.getByRole("link")).toHaveText(["링크", "QR 캠페인", "모집", "분석", "더보기"]);
  });
});

test.describe("the 더보기 tab is the hub for the remaining tools and settings", () => {
  test("the phone tab lists the tools above the account, and settings keep the tab lit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await mockBackend(page);
    await page.goto("/ko/dashboard");
    const tabBar = page.locator("nav:visible").filter({ has: page.getByRole("link", { name: "분석", exact: true }) });
    await tabBar.getByRole("link", { name: "더보기", exact: true }).click();

    await expect(page).toHaveURL(/\/ko\/more$/);
    await expect(page.getByRole("heading", { level: 1, name: "더보기" })).toBeVisible();
    const ctas = page.getByRole("link", { name: /CTA 라이브러리/ });
    const settings = page.getByRole("link", { name: new RegExp(`설정.*${ME.email}`) });
    await expect(ctas).toBeVisible();
    await expect(settings).toBeVisible();
    expect((await ctas.boundingBox())!.y).toBeLessThan((await settings.boundingBox())!.y);
    await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();

    await settings.click();
    await expect(page).toHaveURL(/\/ko\/settings$/);
    await expect(page.getByRole("heading", { level: 1, name: "설정" })).toBeVisible();
    await expect(page.getByRole("link", { name: /CTA 라이브러리/ })).toHaveCount(0);
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
