import { test, expect, type Locator } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

const colors = (disc: Locator) =>
  disc.evaluate((el) => {
    const style = getComputedStyle(el);
    return { bg: style.backgroundColor, fg: style.color };
  });

test("a writer without a photo wears the tint their username picks, the one iOS picks, with their initial", async ({ page }) => {
  await page.goto("/ko/p/haruka");
  const disc = page.locator("[data-avatar-tint]").first();
  await expect(disc).toBeVisible({ timeout: 30_000 });
  await expect(disc).toHaveAttribute("data-avatar-tint", "amber");
  await expect(disc).toHaveText("H");
  expect(await colors(disc)).toEqual({ bg: "rgb(253, 239, 217)", fg: "rgb(162, 98, 26)" });
});

test("in dark the same tint turns to its night pair", async ({ page, context }) => {
  await context.addCookies([{ name: "theme", value: "dark", domain: "localhost", path: "/" }]);
  await page.goto("/ko/p/haruka");
  const disc = page.locator("[data-avatar-tint]").first();
  await expect(disc).toHaveAttribute("data-avatar-tint", "amber", { timeout: 30_000 });
  expect(await colors(disc)).toEqual({ bg: "rgb(58, 44, 23)", fg: "rgb(242, 194, 127)" });
});

test("an account on another server is tinted by its full handle", async ({ page }) => {
  await page.goto("/ko/blog/explore?lane=remote");
  const disc = page.getByTestId("remote-feed").locator("[data-avatar-tint]", { hasText: "M" }).first();
  await expect(disc).toBeVisible({ timeout: 30_000 });
  await expect(disc).toHaveAttribute("data-avatar-tint", "sky");
});

test("people search shows a person on the same tint as their own page", async ({ page }) => {
  await page.goto("/ko/blog?q=har&view=people");
  const disc = page.getByTestId("person-haruka").locator("[data-avatar-tint]");
  await expect(disc).toHaveAttribute("data-avatar-tint", "amber", { timeout: 30_000 });
});
