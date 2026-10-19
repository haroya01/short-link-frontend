import { test, expect } from "@playwright/test";

// Mock-on lane: search results carry one quiet row of #tags used around the query (the mock ranks the tags
// on the matching posts, the query's own words left out). No row when there are none.
test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("a search shows the tags around it under the heading, and a tag leads to its page", async ({ page }) => {
    await page.goto("/ko/blog?q=spring");
    const row = page.getByRole("list", { name: "관련 태그" });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByRole("link")).toHaveText(["#개발"]);
    const heading = page.getByRole("heading", { level: 1 });
    expect((await row.boundingBox())!.y).toBeGreaterThan((await heading.boundingBox())!.y);
    await row.getByRole("link", { name: "#개발" }).click();
    await expect(page).toHaveURL(/\/tags\/%EA%B0%9C%EB%B0%9C/);
  });

  test("a word with many neighbours lists eight at most, and its own tag is not among them", async ({ page }) => {
    await page.goto("/ko/blog?q=개발");
    const row = page.getByRole("list", { name: "관련 태그" });
    await expect(row.getByRole("link")).toHaveCount(8, { timeout: 30_000 });
    await expect(row.getByRole("link", { name: "#개발", exact: true })).toHaveCount(0);
  });

  test("a search with nothing around it shows no row", async ({ page }) => {
    await page.goto("/ko/blog?q=zzzz-없는-말");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("list", { name: "관련 태그" })).toHaveCount(0);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the search sheet shows the same row as you type, and a tag closes the sheet on its page", async ({ page }) => {
    await page.goto("/ko/blog");
    await page.locator("nav.vt-bottom-nav").getByRole("button", { name: "검색" }).click({ timeout: 30_000 });
    const sheet = page.getByRole("dialog", { name: "검색" });
    await sheet.getByRole("searchbox", { name: "검색" }).fill("spring");
    const row = sheet.getByRole("list", { name: "관련 태그" });
    await expect(row.getByRole("link")).toHaveText(["#개발"]);
    await row.getByRole("link", { name: "#개발" }).click();
    await expect(page.getByRole("dialog", { name: "검색" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/tags\/%EA%B0%9C%EB%B0%9C/);
  });
});
