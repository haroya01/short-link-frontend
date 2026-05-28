import { expect, test } from "@playwright/test";

test.describe("auth-protected pages redirect when not logged in", () => {
  test("dashboard shows login prompt", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "로그인이 필요해요" })).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인하러 가기" })).toBeVisible();
  });

  test("stats shows login prompt", async ({ page }) => {
    await page.goto("/stats/abc1234");
    await expect(page.getByRole("heading", { name: "로그인이 필요해요" })).toBeVisible();
  });

  test("nav shows 로그인 button when anonymous", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link").filter({ hasText: "로그인" })).toBeVisible();
  });

  test("login page renders Google + dev token options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /Google로 계속하기/ })).toBeVisible();
    await expect(page.getByText("개발용 access token 직접 입력")).toBeVisible();
  });
});
