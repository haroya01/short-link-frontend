import { expect, test } from "@playwright/test";

/**
 * Regression coverage for the locale switcher cookie write.
 *
 * Without the switcher persisting `NEXT_LOCALE`, the user's choice only updates the URL.
 * Any subsequent middleware-driven entry without a locale prefix (`/`, 404 fallback,
 * OAuth callback) would resolve via the stale cookie and silently bounce the user back
 * to the previously detected language.
 */

test.describe("locale persistence", () => {
  test("switching ja → ko writes NEXT_LOCALE and survives soft + hard nav", async ({
    page,
    context,
  }) => {
    await page.goto("/ja");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/長いURL|クリック/);

    // Open the globe switcher and pick Korean.
    await page.getByRole("button", { name: "言語" }).click();
    await page.getByRole("menuitem", { name: /한국어/ }).click();

    await expect(page).toHaveURL(/\/ko(\/|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/긴 URL|클릭/);

    const cookies = await context.cookies();
    const nextLocale = cookies.find((c) => c.name === "NEXT_LOCALE");
    expect(nextLocale?.value).toBe("ko");

    // Soft nav via header link — should keep the ko prefix and ko content.
    await page.getByRole("link", { name: "단축" }).first().click();
    await expect(page).toHaveURL(/\/ko(\/|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/긴 URL|클릭/);

    // Hard nav to root — middleware should now use the ko cookie instead of bouncing to ja.
    await page.goto("/");
    await expect(page).toHaveURL(/\/ko(\/|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/긴 URL|클릭/);
  });

  test("switching back to en persists across reload", async ({ page, context }) => {
    await page.goto("/ko");
    await page.getByRole("button", { name: "언어" }).click();
    await page.getByRole("menuitem", { name: /English/ }).click();

    await expect(page).toHaveURL(/\/en(\/|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Long URLs|short line/);

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("en");

    await page.reload();
    await expect(page).toHaveURL(/\/en(\/|$)/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Long URLs|short line/);
  });
});
