import { expect, test } from "@playwright/test";

test.describe("auth-protected pages redirect when not logged in", () => {
  test("dashboard shows login prompt", async ({ page }) => {
    await page.goto("/ko/dashboard");
    await expect(page.getByRole("heading", { name: "로그인이 필요해요" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "로그인", exact: true })).toBeVisible();
  });

  test("stats shows login prompt", async ({ page }) => {
    await page.goto("/ko/stats/abc1234");
    await expect(page.getByRole("heading", { name: "로그인이 필요해요" })).toBeVisible();
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
