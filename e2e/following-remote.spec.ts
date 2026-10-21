import { expect, test, type Page } from "@playwright/test";

// Mock lane: the session is @dohyun, who blocked mallory. kazuki follows the kurl mock members plus
// haruto@misskey.io and nora@blog.example, and aoi@mstdn.jp follows kazuki from another server.
// The viewer follows nora.
test.use({ viewport: { width: 390, height: 844 } });

const counts = (page: Page) => page.locator("main header").first().locator("[data-profile-counts]");
const list = (page: Page, tab: string) => page.getByRole("dialog", { name: tab });
const names = (page: Page, tab: string) => list(page, tab).locator("li a > span > span:first-child");
const tab = (page: Page, name: string) =>
  page.getByRole("dialog").getByRole("button", { name, exact: true, pressed: false });

test("the following list mixes accounts on other servers in follow order, each opening its account page", async ({ page }) => {
  await page.goto("/ko/p/kazuki");
  await expect(counts(page).getByRole("button")).toHaveText(["팔로워 129", "팔로잉 14"], { timeout: 30_000 });

  await counts(page).getByRole("button", { name: "팔로잉 14" }).click();
  await expect(names(page, "팔로잉")).toHaveText([
    "@haneul",
    "@haruto@misskey.io",
    "@minseo",
    "@nora@blog.example",
    "@yuna",
    "@haruka",
  ]);

  const nora = list(page, "팔로잉").locator("li", { hasText: "@nora@blog.example" });
  await expect(nora.getByRole("button")).toHaveText("팔로잉");
  await expect(nora.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  const haruto = list(page, "팔로잉").locator("li", { hasText: "@haruto@misskey.io" });
  await haruto.getByRole("button", { name: "팔로우" }).click();
  await expect(haruto.getByRole("button")).toHaveText("요청됨");

  await tab(page, "팔로워").click();
  await expect(names(page, "팔로워")).toHaveText(["@haneul", "@minseo", "@aoi@mstdn.jp", "@yuna", "@haruka"]);
  await expect(list(page, "팔로워").locator("li", { hasText: "@aoi@mstdn.jp" })).toContainText("あおい");

  await tab(page, "팔로잉").click();
  await list(page, "팔로잉").getByRole("link").filter({ hasText: "@nora@blog.example" }).click();
  await expect(page).toHaveURL(/\/remote\/9806$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nora" })).toBeVisible();
});
