import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("blog settings download Mastodon's export files by their own names", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  await expect(page.getByRole("heading", { name: "데이터 내보내기" })).toBeVisible({ timeout: 30_000 });
  for (const kind of ["following", "blocks", "mutes", "domain-blocks", "bookmarks", "lists"]) {
    await expect(page.getByTestId(`export-${kind}`)).toBeVisible();
  }
  const download = page.waitForEvent("download");
  await page.getByTestId("export-following").click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("following_accounts.csv");
  const path = await file.path();
  const text = (await import("node:fs")).readFileSync(path!, "utf8");
  expect(text.startsWith("Account address,Show boosts,Notify on new posts,Languages\n")).toBe(true);
});
