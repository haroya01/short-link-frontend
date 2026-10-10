import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("a writer without a photo wears the tint their user id picks, with their initial", async ({ page }) => {
  await page.goto("/ko/p/haruka");
  const disc = page.locator("[data-avatar-tint]").first();
  await expect(disc).toBeVisible({ timeout: 30_000 });
  await expect(disc).toHaveAttribute("data-avatar-tint", "indigo");
  await expect(disc).toHaveText("H");
  const colors = await disc.evaluate((el) => {
    const style = getComputedStyle(el);
    return { bg: style.backgroundColor, fg: style.color };
  });
  expect(colors).toEqual({ bg: "rgb(224, 231, 255)", fg: "rgb(55, 48, 163)" });
});

test("an account on another server has no local id, so it stays on the neutral disc", async ({ page }) => {
  await page.goto("/ko/blog/notes?feed=federated");
  const disc = page.locator("[data-avatar-tint]", { hasText: "M" }).first();
  await expect(disc).toBeVisible({ timeout: 30_000 });
  await expect(disc).toHaveAttribute("data-avatar-tint", "neutral");
});

test("people search shows a person on the same tint as their own page", async ({ page }) => {
  await page.goto("/ko/blog?q=har&view=people");
  const disc = page.getByTestId("person-haruka").locator("[data-avatar-tint]");
  await expect(disc).toHaveAttribute("data-avatar-tint", "indigo", { timeout: 30_000 });
});
