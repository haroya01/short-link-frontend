import { test, expect, type Locator, type Page } from "@playwright/test";
import ko from "../messages/ko.json";
import ja from "../messages/ja.json";
import en from "../messages/en.json";

const BLOG = "/ko/blog";

const switcher = (page: Page) => page.locator('header[data-feed-switcher="blog"]');
const tabs = (page: Page) => switcher(page).getByRole("navigation").getByRole("link");
const activeTab = (page: Page) => switcher(page).getByRole("navigation").locator('a[aria-current="page"]');

async function settled(page: Page) {
  await expect(switcher(page).locator("[data-feed-more]")).toBeVisible({ timeout: 30_000 });
}

async function expectBarWithin(page: Page, target: Locator) {
  await expect
    .poll(async () => {
      const bar = (await switcher(page).locator("[data-switcher-bar]").boundingBox())!;
      const box = (await target.boundingBox())!;
      return bar.x >= box.x && bar.x + bar.width <= box.x + box.width;
    })
    .toBe(true);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("홈 opens on one header: 팔로잉 · 최신 · 인기 with 최신 picked", async ({ page }) => {
      await page.goto(BLOG);
      await settled(page);
      await expect(tabs(page)).toHaveText(["팔로잉", "최신", "인기"]);
      await expect(activeTab(page)).toHaveText("최신");
      await expect(page.locator("header[data-feed-switcher]")).toHaveCount(1);
    });
  });
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the bell sits in the same place on 홈 and 둘러보기", async ({ page }) => {
    const boxes = [];
    for (const path of [BLOG, "/ko/blog/explore"]) {
      await page.goto(path);
      const bell = page.locator("header.vt-app-header").getByRole("button", { name: "알림" });
      await expect(bell).toBeVisible({ timeout: 30_000 });
      boxes.push((await bell.boundingBox())!);
    }
    expect(Math.round(boxes[1].x)).toBe(Math.round(boxes[0].x));
    expect(Math.round(boxes[1].y)).toBe(Math.round(boxes[0].y));
  });

  test("the header search is an open field on 홈 and leads to the results", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page);
    const field = page.locator("header.vt-app-header").getByRole("searchbox", { name: "검색" });
    await expect(field).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await page.waitForTimeout(300);
    const fits = await field.evaluate((el: HTMLInputElement) => {
      const probe = el.cloneNode() as HTMLInputElement;
      probe.value = el.placeholder;
      probe.style.width = `${el.offsetWidth}px`;
      el.after(probe);
      const ok = probe.scrollWidth <= probe.clientWidth;
      probe.remove();
      return ok;
    });
    expect(fits, "the placeholder fits the field").toBe(true);
    expect(await field.getAttribute("placeholder")).toContain("노트");

    await field.fill("일상");
    await field.press("Enter");
    await page.waitForURL(/[?&]q=%EC%9D%BC%EC%83%81/, { timeout: 30_000 });
    await expect(switcher(page).getByRole("navigation").getByRole("link")).toHaveText(["최신", "인기", "노트", "사람"]);
  });

  test("더 보기 holds only feeds, and picking one switches in place with the selection moved into the slot", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page);
    const slot = switcher(page).locator("[data-feed-more] > button");
    await slot.click();
    await expect(page.getByRole("menuitem")).toHaveText(["추천", "시리즈"]);
    await page.getByRole("menuitem", { name: "추천" }).click();
    await expect(slot).toHaveAccessibleName("홈 피드 더 보기: 추천");
    await expect(page).toHaveURL(/sort=for-you/, { timeout: 30_000 });
    await expect(activeTab(page)).toHaveCount(0);
    await expect(slot).toHaveText("추천");
    await expectBarWithin(page, slot);
  });

  test("an open 더 보기 feed sits in the slot, and a tab takes the underline back", async ({ page }) => {
    await page.goto(`${BLOG}?sort=for-you`);
    await settled(page);
    const slot = switcher(page).locator("[data-feed-more] > button");
    await expect(slot).toHaveAccessibleName("홈 피드 더 보기: 추천");
    await tabs(page).filter({ hasText: "최신" }).click();
    await expect(page).toHaveURL(/sort=recent/, { timeout: 30_000 });
    await expect(slot).toHaveAccessibleName("홈 피드 더 보기");
    await expectBarWithin(page, activeTab(page));
  });

  test("팔로우한 주제 and 내 컬렉션 left the menu for the 서재 page", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page);
    await switcher(page).getByRole("button", { name: "더 보기" }).click();
    await expect(page.getByRole("menuitem", { name: "팔로우한 주제" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "내 컬렉션" })).toHaveCount(0);
    await page.goto("/ko/blog/curation?open=topics");
    await expect(page.locator("#followed-topics").getByRole("button", { expanded: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("main").getByRole("link", { name: "컬렉션" }).first()).toHaveAttribute("href", /\/collections$/);
  });

  test("the bare URL reopens on the last switcher tab, never on a 더 보기 source", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page);
    await tabs(page).filter({ hasText: "인기" }).click();
    await expect(page).toHaveURL(/sort=trending/, { timeout: 30_000 });

    await page.goto(BLOG);
    await settled(page);
    await expect(activeTab(page)).toHaveText("인기");
    await expect(page).not.toHaveURL(/sort/);

    await switcher(page).getByRole("button", { name: "더 보기" }).click();
    await page.getByRole("menuitem").first().click();
    await expect(page).toHaveURL(/sort=/, { timeout: 30_000 });
    await page.goto(BLOG);
    await settled(page);
    await expect(activeTab(page)).toHaveText("인기");

    await tabs(page).filter({ hasText: "팔로잉" }).click();
    await expect(page).toHaveURL(/sort=following/, { timeout: 30_000 });
    await page.goto(BLOG);
    await settled(page);
    await expect(activeTab(page)).toHaveText("팔로잉");
  });

  test("a series tab saved before the switcher had three tabs reopens on 최신", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "kurl_blog_default_tab", value: "series", url: baseURL! }]);
    await page.goto(BLOG);
    await settled(page);
    await expect(activeTab(page)).toHaveText("최신");
  });
});

const CATALOGS = { ko, ja, en };

for (const width of [360, 390]) {
  test.describe(`phone ${width}`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const [lang, catalog] of Object.entries(CATALOGS)) {
      test(`${lang}: the switcher stays one row whatever source is open, the slot showing no words on a phone`, async ({ page }) => {
        const { feedMoreBlog } = catalog.notes;
        for (const [path, source] of [
          [`/${lang}/blog`, null],
          [`/${lang}/blog?sort=for-you`, catalog.publicFeed.forYou],
          [`/${lang}/blog?sort=following`, null],
        ] as const) {
          await page.goto(path);
          await settled(page);
          const more = switcher(page).locator("[data-feed-more] > button");
          await expect(more).toHaveAccessibleName(source ? `${feedMoreBlog}: ${source}` : feedMoreBlog);
          await expect(more).toHaveText("", { useInnerText: true });
          const header = (await switcher(page).boundingBox())!;
          const row = (await switcher(page).getByRole("navigation").boundingBox())!;
          const button = (await more.boundingBox())!;
          expect(header.height, `${path}: one row`).toBeLessThan(60);
          expect(Math.abs(button.y + button.height / 2 - (row.y + row.height / 2)), `${path}: 더 보기 on the tab row`).toBeLessThan(10);
        }
      });
    }

    test("팔로잉's repost setting lives in 더 보기", async ({ page }) => {
      await page.goto(`${BLOG}?sort=following`);
      await settled(page);
      await expect(switcher(page).getByRole("switch")).toHaveCount(0);
      await switcher(page).getByRole("button", { name: "더 보기" }).click();
      await expect(page.getByRole("menuitemcheckbox", { name: "리포스트 보기" })).toHaveAttribute("aria-checked", "true");
    });
  });
}
