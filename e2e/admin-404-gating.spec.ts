import { expect, test } from "@playwright/test";

// Admin surfaces must be invisible to anyone who isn't a signed-in admin: a hard 404, NOT a login
// bounce and NOT a "권한 없음" page — so a prober can't tell the route exists. These run anonymous
// (no auth state), which is exactly the "no admin JWT" case.
const NOT_FOUND_RE = /이 페이지를 찾을 수 없어요|Page not found|ページが見つかりません/;

const ADMIN_PATHS = [
  "/blog/admin",
  "/blog/admin/metrics",
  "/admin/abuse-reports",
  "/admin",
];

test.describe("admin pages hard-404 for non-admins", () => {
  for (const path of ADMIN_PATHS) {
    test(`${path} renders 404 and does not redirect to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(NOT_FOUND_RE)).toBeVisible({ timeout: 5000 });
      // No login bounce — the URL must stay put (not land on /login).
      expect(page.url()).not.toContain("/login");
    });
  }
});
