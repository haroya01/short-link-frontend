import { test, expect } from "@playwright/test";

/**
 * Notes in MOCK-ON: the in-memory note mock serves @dohyun's and @yuna's notes, and the mock session
 * is always @dohyun. Covers the notes page (header entry, first-note notice → post), the public notes
 * tab, and a note page with its reply.
 */
test.use({ viewport: { width: 1280, height: 900 } });

test("the header leads from posts to notes", async ({ page }) => {
  await page.goto("/ko/blog");
  const sections = page.getByRole("navigation", { name: "블로그" });
  await expect(sections.getByRole("link", { name: "글" })).toHaveAttribute("aria-current", "page", { timeout: 30_000 });
  await sections.getByRole("link", { name: "노트" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "노트" })).toBeVisible({ timeout: 30_000 });
  await expect(sections.getByRole("link", { name: "노트" })).toHaveAttribute("aria-current", "page");
});

test("the first note asks about federation once, then posts to the top of the feed", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("오늘 쓴 글의 씨앗")).toBeVisible();

  await composer.fill("가".repeat(485));
  const ring = page.getByRole("img", { name: "15자 남음" });
  await expect(ring).toBeVisible();
  await expect(ring).toContainText("15");
  await composer.fill("e2e에서 쓴 노트 https://kurl.me/about.");
  await expect(page.getByText("누구나 볼 수 있어요")).toBeVisible();
  await page.getByRole("button", { name: "올리기" }).click();

  const notice = page.getByRole("dialog");
  await expect(notice).toContainText("노트는 다른 서버에도 전해져요");
  await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  const posted = page.locator("article").first();
  await expect(posted).toContainText("e2e에서 쓴 노트");
  await expect(posted.getByRole("link", { name: "https://kurl.me/about" })).toHaveAttribute(
    "href",
    "https://kurl.me/about",
  );
  await expect(composer).toHaveValue("");

  await composer.fill("두 번째 노트");
  await page.getByRole("button", { name: "올리기" }).click();
  await expect(page.locator("article").first()).toContainText("두 번째 노트");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a blog post opens the composer with the post quoted", async ({ page }) => {
  await page.goto(
    "/ko/blog/notes?quote=5&quoteTitle=" +
      encodeURIComponent("타입스크립트 제네릭이 어려운 이유") +
      "&quoteSlug=typescript-generics&quoteAuthor=dohyun",
  );
  const quoted = page.locator('div[data-quoted-post-id="5"]');
  await expect(quoted).toContainText("타입스크립트 제네릭이 어려운 이유", { timeout: 30_000 });
  await expect(quoted).toContainText("블로그 글");
  await page.getByRole("button", { name: "인용 빼기" }).click();
  await expect(quoted).toHaveCount(0);
});

test("quoting from a post opens the composer over the post instead of leaving it", async ({ page }) => {
  await page.goto("/ko/p/dohyun/typescript-generics");
  const title = (await page.getByRole("heading", { level: 1 }).first().innerText({ timeout: 30_000 })).trim();
  const quote = page.getByRole("button", { name: "노트로 인용" });
  await quote.scrollIntoViewIfNeeded();
  await quote.click();

  const dialog = page.getByRole("dialog", { name: "노트로 인용" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-quoted-post-id]")).toContainText(title);
  const field = dialog.getByRole("textbox", { name: "생각을 덧붙여 보세요" });
  await expect(field).toBeFocused();
  await field.fill("제네릭은 결국 이름 짓기다");
  await dialog.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" })
    .getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  await expect(page.getByText("인용 노트를 올렸어요")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "노트로 인용" })).toHaveCount(0);
  await expect(page).toHaveURL(/typescript-generics/);
});

test("the profile photo opens large", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes");
  await page.getByRole("button", { name: "프로필 사진 크게 보기" }).click({ timeout: 30_000 });
  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
});

test("the public notes tab lists the author's notes and a note page shows its replies", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes");
  await expect(page.getByRole("link", { name: "노트" }).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("블로그 글을 인용해 봤어요.")).toBeVisible();
  await expect(page.getByAltText("비 오는 창밖")).toBeVisible();
  await expect(page.getByRole("link", { name: /타입스크립트 제네릭이 어려운 이유/ })).toBeVisible();

  await page.goto("/ko/p/yuna/notes/3");
  await expect(page.getByText("오늘 쓴 글의 씨앗")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "답글" })).toBeVisible();
  await expect(page.getByText("좋은 생각이에요")).toBeVisible();
});

test("photos sit in a sideways strip with ALT, open large, and share copies the note link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true });
  });
  await page.goto("/ko/blog/notes");
  const walk = page.locator('article[data-note-id="5"]');
  await expect(walk.locator("figure")).toHaveCount(3, { timeout: 30_000 });

  await walk.getByRole("button", { name: "사진 설명 보기" }).first().click();
  await expect(walk.getByText("골목 끝에 선 가로등")).toBeVisible();

  await walk.locator("figure").first().getByRole("button").first().click();
  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText("1 / 3");
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);

  await walk.getByRole("button", { name: "공유" }).click();
  await expect(page.getByText("링크를 복사했어요")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/notes\/5$/);
});

test("a picked photo sits in the composer strip and takes alt text from its +ALT badge", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await composer.click({ timeout: 30_000 });
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DwHwQZGBgAJmQF+2Sp1QYAAAAASUVORK5CYII=",
    "base64",
  );
  await page.locator('input[type="file"]').setInputFiles({ name: "walk.png", mimeType: "image/png", buffer: png });
  const addAlt = page.getByRole("button", { name: "대체 텍스트 추가" });
  await expect(addAlt).toHaveText("+ALT");
  await addAlt.click();
  await page.getByLabel("대체 텍스트", { exact: true }).fill("산책길의 낮은 담장");
  await page.getByRole("button", { name: "완료" }).click();
  await expect(addAlt).toHaveText("ALT");
  await expect(page.getByAltText("산책길의 낮은 담장")).toBeVisible();
});

test("any signed-in reader can file someone's note into a collection, and the note block links back", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const yunaNote = page.locator("article", { hasText: "오늘 쓴 글의 씨앗" });
  await yunaNote.getByRole("button", { name: "노트 메뉴" }).click({ timeout: 30_000 });
  await expect(yunaNote.getByRole("menuitem", { name: "고치기" })).toHaveCount(0);
  await yunaNote.getByRole("menuitem", { name: "컬렉션에 연결" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.goto("/ko/blog/collections/1");
  const block = page.locator('a[data-bhv-id="note/3"]').first();
  await expect(block).toBeVisible({ timeout: 30_000 });
  await expect(block).toContainText("yuna");
  await expect(block).toHaveAttribute("href", /notes\/3$/);
});

test("the repost button reposts from its menu and the same menu takes it back", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const walk = page.locator('article[data-note-id="5"]');
  const repost = walk.getByRole("button", { name: "리포스트" });
  await expect(repost).toHaveAttribute("aria-pressed", "false", { timeout: 30_000 });

  await repost.click();
  await walk.getByRole("menuitem", { name: "리포스트" }).click();
  const undo = walk.getByRole("button", { name: "리포스트 취소" });
  await expect(undo).toHaveAttribute("aria-pressed", "true");
  await expect(walk.getByRole("menu")).toHaveCount(0);

  await undo.click();
  await walk.getByRole("menuitem", { name: "리포스트 취소" }).click();
  await expect(walk.getByRole("button", { name: "리포스트" })).toHaveAttribute("aria-pressed", "false");
});

test("quoting a note opens a composer over the feed with that note under it", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const walk = page.locator('article[data-note-id="5"]');
  await walk.getByRole("button", { name: "리포스트" }).click({ timeout: 30_000 });
  await walk.getByRole("menuitem", { name: "인용" }).click();

  const dialog = page.getByRole("dialog", { name: "노트 인용" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-quoted-note-id="5"]')).toContainText("산책하다 찍은 것들");
  const field = dialog.getByRole("textbox", { name: "생각을 덧붙여 보세요" });
  await expect(field).toBeFocused();
  await field.fill("나도 오늘 같은 길을 걸었다");
  await dialog.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" })
    .getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  await expect(page.getByText("인용 노트를 올렸어요")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "노트 인용" })).toHaveCount(0);
  const posted = page.locator("article").first();
  await expect(posted).toContainText("나도 오늘 같은 길을 걸었다");
  await expect(posted.locator('a[data-quoted-note-id="5"]')).toHaveAttribute("href", /notes\/5$/);
});

test("the reposts tab lists what the author reposted under a reposted-by line", async ({ page }) => {
  await page.goto("/ko/p/yuna/reposts");
  await expect(page.getByRole("link", { name: "리포스트" })).toHaveAttribute("aria-current", "page", {
    timeout: 30_000,
  });
  const reposted = page.locator('article[data-note-id="6"]');
  await expect(reposted).toContainText("yuna님이 리포스트함");
  await expect(reposted).toContainText("이 사진들 보고 나도 오늘 걸었다.");
  await expect(reposted.locator('a[data-quoted-note-id="5"]')).toContainText("yuna");
});
