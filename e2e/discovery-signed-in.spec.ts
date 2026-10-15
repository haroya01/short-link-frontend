import { test, expect, type Page } from "@playwright/test";

/**
 * Discovery lists for a signed-in reader, in MOCK-ON. The mock session is always signed in, and the
 * mock server leaves kazuki out of a signed-in reader's lists (kazuki blocked them) — something the
 * reader's own block list can't know. Server renders stay anonymous: they keep kazuki, for search
 * engines and the first paint. Once the page knows who is reading, it fetches the reader's own list.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const KAZUKI_POST = 'a[href="/ko/p/kazuki/kyoto-workation"]';
const MINJI_DAILY = 'a[href="/ko/p/minji/coffee-routine"]';

async function serverHtml(page: Page, path: string) {
  return (await page.request.get(path)).text();
}

test("the home feed renders anonymously on the server, then shows the reader's own list", async ({ page }) => {
  expect(await serverHtml(page, "/ko/blog")).toContain(`href="/ko/p/kazuki/kyoto-workation"`);
  await page.goto("/ko/blog");
  await expect(page.locator('main a[href="/ko/p/minji/pricing-experiment-free-to-pro"]').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator(`main ${KAZUKI_POST}`)).toHaveCount(0);
});

test("a search shows the reader's own results", async ({ page }) => {
  await page.goto("/ko/blog?q=%EC%9D%BC%EC%83%81");
  await expect(page.locator(`main ${MINJI_DAILY}`).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(`main ${KAZUKI_POST}`)).toHaveCount(0);
});

test("a topic page shows the reader's own posts and suggested authors", async ({ page }) => {
  const path = "/ko/blog/tags/%EC%9D%BC%EC%83%81";
  expect(await serverHtml(page, path)).toContain(`href="/ko/p/kazuki"`);
  await page.goto(path);
  await expect(page.locator(`main ${MINJI_DAILY}`).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('main a[href="/ko/p/sora"]').first()).toBeVisible();
  await expect(page.locator(`main ${KAZUKI_POST}`)).toHaveCount(0);
  await expect(page.locator('main a[href="/ko/p/kazuki"]')).toHaveCount(0);
});

test("a post's next reads are picked from the reader's own topic feed", async ({ page }) => {
  await page.goto("/ko/p/minji/coffee-routine");
  const next = page.getByRole("region", { name: "다음 읽을 글" });
  await expect(next.locator("li").first()).toBeVisible({ timeout: 30_000 });
  await expect(next.locator('a[href^="/ko/p/kazuki/"]')).toHaveCount(0);
});

test("the header search suggests only what the reader may see", async ({ page }) => {
  await page.goto("/ko/blog");
  await page.locator("header").getByRole("searchbox", { name: "검색" }).fill("일상", { timeout: 30_000 });
  const results = page.getByRole("search").locator("ul");
  await expect(results.locator(MINJI_DAILY)).toBeVisible({ timeout: 10_000 });
  await expect(results.locator(KAZUKI_POST)).toHaveCount(0);
});
