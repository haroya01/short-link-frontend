import { test, expect, type Page } from "@playwright/test";
import ko from "../messages/ko.json";
import ja from "../messages/ja.json";
import en from "../messages/en.json";

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

  test("the header search is the same open field on both feeds and leads to the same results", async ({ page }) => {
    const fields = [];
    for (const [path, surface] of [[BLOG, "blog"], [NOTES, "notes"]] as const) {
      await page.goto(path);
      await settled(page, surface);
      const field = page.locator("header.vt-app-header").getByRole("searchbox", { name: "검색" });
      await expect(field).toBeVisible();
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      await page.waitForTimeout(300);
      const box = (await field.boundingBox())!;
      const placeholder = await field.getAttribute("placeholder");
      const fits = await field.evaluate((el: HTMLInputElement) => {
        const probe = el.cloneNode() as HTMLInputElement;
        probe.value = el.placeholder;
        probe.style.width = `${el.offsetWidth}px`;
        el.after(probe);
        const ok = probe.scrollWidth <= probe.clientWidth;
        probe.remove();
        return ok;
      });
      expect(fits, `${surface}: the placeholder fits the field`).toBe(true);
      fields.push({ x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height), placeholder });
    }
    expect(fields[1]).toEqual(fields[0]);
    expect(fields[0].placeholder).toContain("노트");

    const field = page.locator("header.vt-app-header").getByRole("searchbox", { name: "검색" });
    await field.fill("일상");
    await field.press("Enter");
    await page.waitForURL(/[?&]q=%EC%9D%BC%EC%83%81/, { timeout: 30_000 });
    await expect(switcher(page, "blog").getByRole("navigation").getByRole("link")).toHaveText(["최신", "인기", "노트", "사람"]);
  });

  test("더 보기 holds only feeds, and picking one switches in place with the selection moved into the slot", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page, "blog");
    const slot = switcher(page, "blog").locator("[data-feed-more] > button");
    await slot.click();
    await expect(page.getByRole("menuitem")).toHaveText(["추천", "시리즈"]);
    await page.getByRole("menuitem", { name: "추천" }).click();
    await expect(slot).toHaveAccessibleName("더 보기: 추천");
    await expect(page).toHaveURL(/sort=for-you/, { timeout: 30_000 });
    await expect(activeTab(page, "blog")).toHaveCount(0);
    await expect(slot).toHaveText("추천");
    const bar = (await switcher(page, "blog").locator("[data-switcher-bar]").boundingBox())!;
    const box = (await slot.boundingBox())!;
    expect(bar.x).toBeGreaterThanOrEqual(box.x);
    expect(bar.x + bar.width).toBeLessThanOrEqual(box.x + box.width);

    await page.goto(NOTES);
    await settled(page, "notes");
    await switcher(page, "notes").locator("[data-feed-more] > button").click();
    await expect(page.getByRole("menuitem").nth(0)).toHaveText("다른 서버");
    await expect(page.getByRole("menuitem").nth(1)).toHaveText("북마크");
    await expect(page.getByRole("menuitem").nth(2)).toHaveText("개인 멘션");
    await expect(page.getByRole("menuitem", { name: "리스트", exact: true })).toHaveCount(0);
  });

  test("an open 더 보기 feed sits in the slot by its short name, and a tab takes the underline back", async ({ page }) => {
    await page.goto(`${NOTES}?feed=direct`);
    await settled(page, "notes");
    const slot = switcher(page, "notes").locator("[data-feed-more] > button");
    await expect(slot).toHaveAccessibleName("더 보기: 개인 멘션");
    await expect(slot).toHaveText("멘션");
    await tabs(page, "notes").filter({ hasText: "최신" }).click();
    await expect(page).toHaveURL(/feed=everyone/, { timeout: 30_000 });
    await expect(slot).toHaveAccessibleName("더 보기");
    const bar = (await switcher(page, "notes").locator("[data-switcher-bar]").boundingBox())!;
    const latest = (await activeTab(page, "notes").boundingBox())!;
    expect(bar.x).toBeGreaterThanOrEqual(latest.x);
    expect(bar.x + bar.width).toBeLessThanOrEqual(latest.x + latest.width);
  });

  test("팔로우한 주제 and 내 컬렉션 left the menu for the 서재 page", async ({ page }) => {
    await page.goto(BLOG);
    await settled(page, "blog");
    await switcher(page, "blog").getByRole("button", { name: "더 보기" }).click();
    await expect(page.getByRole("menuitem", { name: "팔로우한 주제" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "내 컬렉션" })).toHaveCount(0);
    await page.goto("/ko/blog/curation?open=topics");
    await expect(page.locator("#followed-topics").getByRole("button", { expanded: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("main").getByRole("link", { name: "컬렉션" }).first()).toHaveAttribute("href", /\/collections$/);
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

const CATALOGS = { ko, ja, en };

for (const width of [360, 390]) {
  test.describe(`phone ${width}`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const [lang, catalog] of Object.entries(CATALOGS)) {
      test(`${lang}: the switcher stays one row whatever source is open, with 더 보기 as an icon`, async ({ page }) => {
        const { feedMore, feedFederated, feedDirect } = catalog.notes;
        for (const [path, surface, source] of [
          [`/${lang}/blog`, "blog", null],
          [`/${lang}/blog/notes?feed=federated`, "notes", feedFederated],
          [`/${lang}/blog/notes?feed=direct`, "notes", feedDirect],
          [`/${lang}/blog/notes?feed=following`, "notes", null],
        ] as const) {
          await page.goto(path);
          await settled(page, surface);
          const more = switcher(page, surface).locator("[data-feed-more] > button");
          await expect(more).toHaveAccessibleName(source ? `${feedMore}: ${source}` : feedMore);
          await expect(more).toHaveText("", { useInnerText: true });
          const header = (await switcher(page, surface).boundingBox())!;
          const row = (await switcher(page, surface).getByRole("navigation").boundingBox())!;
          const button = (await more.boundingBox())!;
          expect(header.height, `${path}: one row`).toBeLessThan(60);
          expect(Math.abs(button.y + button.height / 2 - (row.y + row.height / 2)), `${path}: 더 보기 on the tab row`).toBeLessThan(10);
        }
      });
    }

    test("팔로잉's repost setting lives in 더 보기", async ({ page }) => {
      await page.goto("/ko/blog/notes?feed=following");
      await settled(page, "notes");
      await expect(switcher(page, "notes").getByRole("switch")).toHaveCount(0);
      await switcher(page, "notes").getByRole("button", { name: "더 보기" }).click();
      await expect(page.getByRole("menuitemcheckbox", { name: "리포스트 보기" })).toHaveAttribute("aria-checked", "true");
    });
  });
}
