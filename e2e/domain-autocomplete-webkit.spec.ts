import { expect, test } from "@playwright/test";

test("on an iPhone, tapping a server keeps the keyboard on the field and fills the handle", async ({ page }) => {
  await page.goto("/ko/blog/explore");
  const box = page.getByRole("searchbox", { name: "검색" });
  await box.tap({ timeout: 30_000 });
  await box.pressSequentially("@gargron@mast", { delay: 20 });
  const row = page.getByTestId("domain-completions").getByRole("button", { name: "@gargron@mastodon.social" });
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.tap();
  await expect(box).toHaveValue("@gargron@mastodon.social");
  await expect(box).toBeFocused();
  await expect(page.getByTestId("domain-completions")).toHaveCount(0);
});
