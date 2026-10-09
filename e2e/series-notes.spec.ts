import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Notes inside a series, in MOCK-ON. The mock author @dohyun (also the mock session) keeps
 * "리팩터링 일지" — a post, note 40, a post — and "짧은 생각들", notes alone. 구독함 pages are posts with
 * note 40 between them, then a page of notes only, then one older post.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const NOTE_40 = "이름 하나 바꾸는 데 하루를 썼다";
const FIRST_COMMIT = "첫 커밋 회고: 아무도 안 쓸 줄 알았던 링크";

function seriesBanner(page: Page, title: string): Locator {
  return page.locator("nav").filter({ hasText: title }).first();
}

test("the series page lists a note in its place and opens it", async ({ page }) => {
  await page.goto("/ko/p/dohyun/series/refactoring-diary");
  await expect(page.getByRole("heading", { level: 1, name: "리팩터링 일지" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main header")).toContainText("3편");

  const rows = page.locator("main ol > li");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Spring Boot 트랜잭션 전파");
  await expect(rows.nth(1)).toContainText(NOTE_40);
  await expect(rows.nth(1)).toContainText("노트");
  await expect(rows.nth(1)).toContainText("2");
  await expect(rows.nth(2)).toContainText(FIRST_COMMIT);

  await rows.nth(1).getByRole("link").click();
  await page.waitForURL(/\/p\/dohyun\/notes\/40$/, { timeout: 30_000 });
  await expect(page.locator('article[data-note-id="40"]')).toContainText(NOTE_40);
});

test("a series of notes alone lists them, warning first, instead of the empty state", async ({ page }) => {
  await page.goto("/ko/p/dohyun/series/short-thoughts");
  const rows = page.locator("main ol > li");
  await expect(rows).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator("main header")).toContainText("2편");
  await expect(rows.nth(0)).toContainText("짧게 자주 쓰기로 했다");
  await expect(rows.nth(1)).toContainText("팀 회고 — 조금 무거운 이야기");
  await expect(rows.nth(1)).not.toContainText("이름은 다 뺐다");
  await expect(page.getByText("이 조건에 맞는 글이 없어요")).toHaveCount(0);
});

test("the series navigation walks post → note → post", async ({ page }) => {
  await page.goto("/ko/p/dohyun/spring-tx-propagation");
  const banner = seriesBanner(page, "리팩터링 일지");
  await expect(banner).toBeVisible({ timeout: 30_000 });
  await expect(banner).toContainText("1 / 3");

  const next = page.locator("[data-series-next]");
  await expect(next).toContainText(NOTE_40);
  await expect(next).toContainText("노트");
  await next.click();
  await page.waitForURL(/\/p\/dohyun\/notes\/40$/, { timeout: 30_000 });

  const noteBanner = seriesBanner(page, "리팩터링 일지");
  await expect(noteBanner).toContainText("2 / 3", { timeout: 30_000 });
  await noteBanner.getByRole("button", { name: "이 시리즈" }).click();
  await expect(noteBanner.locator('[aria-current="true"]')).toContainText(NOTE_40);
  await expect(noteBanner.getByRole("link", { name: /Spring Boot 트랜잭션 전파/ })).toHaveAttribute(
    "href",
    /\/p\/dohyun\/spring-tx-propagation$/,
  );

  const noteNext = page.locator("[data-series-next]");
  await expect(noteNext).toContainText(FIRST_COMMIT);
  await noteNext.click();
  await page.waitForURL(/\/p\/dohyun\/first-commit-retro$/, { timeout: 30_000 });
  await expect(seriesBanner(page, "리팩터링 일지")).toContainText("3 / 3", { timeout: 30_000 });
});

test("구독함 places a series note before an older post and loads past a page of notes", async ({ page }) => {
  await page.goto("/ko/blog?sort=following");
  const note = page.locator('li[data-series-note="40"]');
  await expect(note).toBeVisible({ timeout: 30_000 });
  await expect(note).toContainText("리팩터링 일지");
  await expect(note).toContainText("노트");
  await expect(note.getByRole("link", { name: new RegExp(NOTE_40) })).toHaveAttribute(
    "href",
    /\/p\/dohyun\/notes\/40$/,
  );

  const rows = await page.locator("main ul > li").allInnerTexts();
  const at = (text: string) => rows.findIndex((row) => row.includes(text));
  expect(at("교토에서 한 달 살기")).toBeLessThan(at(NOTE_40));
  expect(at(NOTE_40)).toBeLessThan(at("Spring Boot 트랜잭션 전파"));

  for (let i = 0; i < 6 && (await page.getByText(FIRST_COMMIT).count()) === 0; i++) {
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(400);
  }
  await expect(page.locator('li[data-series-note="41"]')).toContainText("팀 회고 — 조금 무거운 이야기");
  await expect(page.locator('li[data-series-note="41"]')).not.toContainText("이름은 다 뺐다");
  await expect(page.getByText(FIRST_COMMIT)).toBeVisible();
  await expect(page.locator("main").getByRole("button", { name: "더 보기" })).toHaveCount(0);
});

test("a subscribed series row lists its note among the episodes and opens the series", async ({ page }) => {
  await page.goto("/ko/blog?sort=series");
  const row = page.locator("main li[data-series-row]").filter({ has: page.getByRole("heading", { name: "리팩터링 일지" }) });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row).toContainText("시리즈·3편");
  await expect(row).toContainText(NOTE_40);
  await expect(row.getByRole("link", { name: /리팩터링 일지/ })).toHaveAttribute("href", /\/p\/dohyun\/series\/[^/]+$/);
});

test("the owner adds a note to a series from the picker and reorders it", async ({ page }) => {
  await page.goto("/ko/blog/write?view=series");
  const group = page.locator("section").filter({ has: page.getByText("리팩터링 일지", { exact: true }) });
  const items = group.locator("ol > li");
  await expect(items).toHaveCount(2, { timeout: 30_000 });
  await expect(items.nth(0)).toContainText("로컬에서 쓴 발행 글");
  await expect(items.nth(1)).toContainText(NOTE_40);
  await expect(items.nth(1)).toContainText("노트");

  await group.getByRole("button", { name: "노트 추가" }).click();
  const picker = group.locator("[data-note-picker]");
  await expect(picker).toContainText("블로그 글을 인용해 봤어요.", { timeout: 30_000 });
  await expect(picker).not.toContainText(NOTE_40);
  await expect(group).toContainText("팔로워만·멘션한 사람만 보는 노트는 시리즈에 들어가지 않아요");
  await picker.getByRole("button", { name: /블로그 글을 인용해 봤어요/ }).click();
  await group.getByRole("button", { name: "1개 추가" }).click();

  await expect(items).toHaveCount(3);
  await expect(items.nth(2)).toContainText("블로그 글을 인용해 봤어요.");
  await expect(group).toContainText("3편");
  await items.nth(2).getByRole("button", { name: "위로" }).click();
  await expect(items.nth(1)).toContainText("블로그 글을 인용해 봤어요.");

  await page.getByRole("button", { name: "목록", exact: true }).click();
  await page.getByRole("button", { name: "시리즈별", exact: true }).click();
  const reloaded = page
    .locator("section")
    .filter({ has: page.getByText("리팩터링 일지", { exact: true }) })
    .locator("ol > li");
  await expect(reloaded).toHaveCount(3, { timeout: 30_000 });
  await expect(reloaded.nth(0)).toContainText("로컬에서 쓴 발행 글");
  await expect(reloaded.nth(1)).toContainText("블로그 글을 인용해 봤어요.");
  await expect(reloaded.nth(2)).toContainText(NOTE_40);
});

test("a note's menu puts it into one of my series or a new one", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const mine = page.locator('article[data-note-id="1"]');
  await expect(mine).toBeVisible({ timeout: 30_000 });

  const openDialog = async () => {
    await mine.getByRole("button", { name: "노트 메뉴" }).click();
    await mine.getByRole("menuitem", { name: "시리즈에 넣기" }).click();
    const dialog = page.getByRole("dialog", { name: "시리즈에 넣기" });
    await expect(dialog).toBeVisible();
    return dialog;
  };

  let dialog = await openDialog();
  await dialog.getByRole("button", { name: /로컬 예시 시리즈/ }).click();
  await expect(page.getByText("‘로컬 예시 시리즈’에 넣었어요")).toBeVisible();
  await expect(dialog).toHaveCount(0);

  dialog = await openDialog();
  await expect(dialog.getByRole("button", { name: /로컬 예시 시리즈/ })).toContainText("1편");
  await dialog.getByRole("button", { name: /로컬 예시 시리즈/ }).click();
  await expect(page.getByText("이미 ‘로컬 예시 시리즈’에 있어요")).toBeVisible();

  dialog = await openDialog();
  await dialog.getByRole("textbox", { name: "새 시리즈 이름" }).fill("산책 기록");
  await dialog.getByRole("button", { name: "만들고 넣기" }).click();
  await expect(page.getByText("‘산책 기록’에 넣었어요")).toBeVisible();

  const someoneElse = page.locator('article[data-note-id="3"]');
  await someoneElse.getByRole("button", { name: "노트 메뉴" }).click();
  await expect(someoneElse.getByRole("menuitem", { name: "시리즈에 넣기" })).toHaveCount(0);
});
