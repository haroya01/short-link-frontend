import { expect, test } from "@playwright/test";

test.describe("auth-protected pages ask to sign in when not logged in", () => {
  test("dashboard shows one line and a sign-in button that opens the sign-in sheet", async ({ page }) => {
    await page.goto("/ko/dashboard");
    await expect(page.getByRole("heading", { name: "내 링크를 보려면 로그인하세요" })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "로그인", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "내 링크를 보려면 로그인하세요" });
    await expect(sheet.getByRole("button", { name: "Google 계정으로 로그인" })).toBeVisible();
    await expect(page).toHaveURL(/\/ko\/dashboard$/);
  });

  test("stats shows login prompt", async ({ page }) => {
    await page.goto("/ko/stats/abc1234");
    await expect(page.getByRole("heading", { name: "통계를 보려면 로그인하세요" })).toBeVisible();
  });

  test("nav shows 로그인 button when anonymous", async ({ page }) => {
    await page.goto("/ko");
    await expect(page.getByRole("banner").getByRole("link", { name: "로그인", exact: true }).first()).toBeVisible();
  });

  test("login page offers Google sign-in and a no-login path", async ({ page }) => {
    await page.goto("/ko/login");
    await expect(page.getByRole("heading", { name: "kurl에 로그인" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Google 계정으로 로그인")).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인 없이 단축만 사용하기" })).toBeVisible();
  });
});
