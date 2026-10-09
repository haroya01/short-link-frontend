import { test, expect, type Page } from "@playwright/test";

/**
 * The blog feed and the notes timeline share one header in MOCK-ON (the mock session is signed in):
 * [팔로잉 · 최신 · 인기] in the same place, the surface's other sources under "더 보기", and the last
 * switcher tab remembered per surface so the bare URL reopens on it.
 */

const BLOG = "/ko/blog";
const NOTES = "/ko/blog/notes";

const switcher = (page: Page, surface: "blog" | "notes") => page.locator(`header[data-feed-switcher="${surface}"]`);
const tabs = (page: Page, surface: "blog" | "notes") => switcher(page, surface).getByRole("navigation").getByRole("link");
const activeTab = (page: Page, surface: "blog" | "notes") =>
  switcher(page, surface).getByRole("navigation").locator('a[aria-current="page"]');

async function settled(page: Page, surface: "blog" | "notes") {
  await expect(switcher(page, surface).locator("[data-feed-more]")).toBeVisible({ timeout: 30_000 });
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("both feeds open on the same header, with the same names, in the same place", async ({ page }) => {
      const boxes = [];
      for (const [path, surface] of [[BLOG, "blog"], [NOTES, "notes"]] as const) {
        await page.goto(path);
        await settled(page, surface);
        await expect(tabs(page, surface)).toHaveText(["팔로잉", "최신", "인기"]);
        await expect(activeTab(page, surface)).toHaveText("최신");
        boxes.push((await switcher(page, surface).boundingBox())!);
      }
      const [blog, notes] = boxes;
      expect(Math.round(notes.x)).toBe(Math.round(blog.x));
      expect(Math.round(notes.y)).toBe(Math.round(blog.y));
      expect(Math.round(notes.width)).toBe(Math.round(blog.width));
    });
  });
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the bell sits in the same place on both feeds", async ({ page }) => {
    const boxes = [];
    for (const [path, surface] of [[BLOG, "blog"], [NOTES, "notes"]] as const) {
      await page.goto(path);
      await settled(page, surface);
      const bell = page.locator("header.vt-app-header").getByRole("button", { name: "알림" });
      await expect(bell).toBeVisible();
      boxes.push((await bell.boundingBox())!);
    }
    expect(Math.round(boxes[1].x)).toBe(Math.round(boxes[0].x));
    expect(Math.round(boxes[1].y)).toBe(Math.round(boxes[0].y));
  });

  test("each surface keeps its own sources under 더 보기", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page, "blog");
    await switcher(page, "blog").getByRole("button", { name: "더 보기" }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["추천", "시리즈", "팔로우한 주제", "내 컬렉션"]);
    await page.getByRole("menuitem", { name: "추천" }).click();
    await expect(page).toHaveURL(/sort=for-you/, { timeout: 30_000 });
    await expect(switcher(page, "blog").getByRole("button", { name: "추천" })).toBeVisible();
    await expect(activeTab(page, "blog")).toHaveCount(0);

    await page.goto(NOTES);
    await settled(page, "notes");
    await switcher(page, "notes").getByRole("button", { name: "더 보기" }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["다른 서버", "북마크", "개인 멘션", "리스트"]);
  });

  test("팔로우한 주제 opens the library with that section unfolded", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page, "blog");
    await switcher(page, "blog").getByRole("button", { name: "더 보기" }).click();
    await page.getByRole("menuitem", { name: "팔로우한 주제" }).click();
    await page.waitForURL(/\/curation\?open=topics/, { timeout: 30_000 });
    await expect(page.locator("#followed-topics").getByRole("button", { expanded: true })).toBeVisible({ timeout: 30_000 });
  });

  for (const [path, surface, param] of [[BLOG, "blog", "sort"], [NOTES, "notes", "feed"]] as const) {
    test(`${surface}: the bare URL reopens on the last switcher tab, never on a 더 보기 source`, async ({ page }) => {
      await page.goto(path);
      await settled(page, surface);
      await tabs(page, surface).filter({ hasText: "인기" }).click();
      await expect(page).toHaveURL(new RegExp(`${param}=trending`), { timeout: 30_000 });

      await page.goto(path);
      await settled(page, surface);
      await expect(activeTab(page, surface)).toHaveText("인기");
      await expect(page).not.toHaveURL(new RegExp(param));

      await switcher(page, surface).getByRole("button", { name: "더 보기" }).click();
      await page.getByRole("menuitem").first().click();
      await expect(page).toHaveURL(new RegExp(`${param}=`), { timeout: 30_000 });
      await page.goto(path);
      await settled(page, surface);
      await expect(activeTab(page, surface)).toHaveText("인기");

      await tabs(page, surface).filter({ hasText: "팔로잉" }).click();
      await expect(page).toHaveURL(new RegExp(`${param}=following`), { timeout: 30_000 });
      await page.goto(path);
      await settled(page, surface);
      await expect(activeTab(page, surface)).toHaveText("팔로잉");
    });
  }

  test("the two surfaces remember separately", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page, "blog");
    await tabs(page, "blog").filter({ hasText: "인기" }).click();
    await expect(page).toHaveURL(/sort=trending/, { timeout: 30_000 });

    await page.goto(NOTES);
    await settled(page, "notes");
    await expect(activeTab(page, "notes")).toHaveText("최신");
  });

  test("a series tab saved before the switcher had three tabs reopens on 최신", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "kurl_blog_default_tab", value: "series", url: baseURL! }]);
    await page.goto(BLOG);
    await settled(page, "blog");
    await expect(activeTab(page, "blog")).toHaveText("최신");
  });
});
