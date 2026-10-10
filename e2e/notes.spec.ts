import { test, expect, type Locator, type Page } from "@playwright/test";
import { expectOnTop, toastBy } from "./helpers/on-top";

/**
 * Notes in MOCK-ON: the in-memory note mock serves @dohyun's and @yuna's notes, and the mock session
 * is always @dohyun. Covers the notes page (header entry, first-note notice → post), the public notes
 * tab, and a note page with its reply.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DwHwQZGBgAJmQF+2Sp1QYAAAAASUVORK5CYII=";

async function openMoreFeed(page: Page, name: string) {
  await page.getByRole("button", { name: "더 보기" }).click({ timeout: 30_000 });
  await page.getByRole("menuitem", { name }).click();
}

async function handPhoto(field: Locator, how: "paste" | "drop") {
  await field.evaluate(
    async (node, { how, png }) => {
      const photo = new DataTransfer();
      photo.items.add(new File([Uint8Array.from(atob(png), (c) => c.charCodeAt(0))], "walk.png", { type: "image/png" }));
      const init = { bubbles: true, cancelable: true };
      node.dispatchEvent(
        how === "paste"
          ? new ClipboardEvent("paste", { ...init, clipboardData: photo })
          : new DragEvent("drop", { ...init, dataTransfer: photo }),
      );
      await new Promise(requestAnimationFrame);
    },
    { how, png: PNG },
  );
}

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
  await expect(page.getByRole("combobox", { name: "공개 범위" })).toHaveValue("public");
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

  await expectOnTop(toastBy(page, "인용 노트를 올렸어요"));
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
  await expect(walk.getByRole("menuitem", { name: "다른 앱으로 공유" })).toHaveCount(0);
  await walk.getByRole("menuitem", { name: "링크 복사" }).click();
  await expectOnTop(toastBy(page, "링크를 복사했어요"));
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/notes\/5$/);
  await expect(walk.getByRole("menu")).toHaveCount(0);
});

test("share starts a blog post that carries the note as a card", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const walk = page.locator('article[data-note-id="5"]');
  await walk.getByRole("button", { name: "공유" }).click({ timeout: 30_000 });
  await walk.getByRole("menuitem", { name: "블로그 글로 인용" }).click();

  await expect(page).toHaveURL(/\/write\/new\?quote=.*notes%2F5$/, { timeout: 30_000 });
  const card = page.locator('[data-note-embed="5"]');
  await expect(card).toContainText("산책하다 찍은 것들", { timeout: 30_000 });
  await expect(card).toContainText("yuna");
});

test("a blog post that carries a note shows it as a card that opens the note", async ({ page }) => {
  await page.goto("/ko/p/kazuki/kyoto-workation");
  const card = page.locator('[data-note-embed="5"]');
  await expect(card).toContainText("산책하다 찍은 것들", { timeout: 30_000 });
  await expect(card.locator('a[data-quoted-note-id="5"]')).toHaveAttribute("href", /\/notes\/5$/);
});

test("a note's quotes list the blog posts that carry it above the notes that quote it", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/5/quotes");
  const posts = page.getByTestId("quoting-posts");
  await expect(posts.getByRole("heading", { name: "이 노트를 실은 글" })).toBeVisible({ timeout: 30_000 });
  await expect(posts.getByRole("link", { name: /교토에서 한 달 살기/ })).toBeVisible();
  await expect(page.locator('article[data-note-id="6"]')).toContainText("이 사진들 보고 나도 오늘 걸었다.");
  await expect(page.getByText("아직 이 노트를 인용한 노트나 글이 없어요")).toHaveCount(0);
});

test("a picked photo sits in the composer strip and takes alt text from its +ALT badge", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await composer.click({ timeout: 30_000 });
  const png = Buffer.from(PNG, "base64");
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
  await yunaNote.getByRole("menuitem", { name: "엮기", exact: true }).click();
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

  await expectOnTop(toastBy(page, "인용 노트를 올렸어요"));
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

test("clicking a note's text opens it, while its links and buttons keep their own job", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const seed = page.locator('article[data-note-id="3"]');
  await expect(seed.getByRole("link", { name: "https://kurl.me/about" })).toBeVisible({ timeout: 30_000 });
  await seed.getByRole("button", { name: "공유" }).click();
  await expect(seed.getByRole("menuitem", { name: "링크 복사" })).toBeVisible();
  await expect(page).toHaveURL(/\/blog\/notes$/);

  await seed.locator("p").first().click({ position: { x: 8, y: 8 } });
  await expect(page).toHaveURL(/\/notes\/3$/);
  await expect(page.getByRole("heading", { name: "답글" })).toBeVisible();
});

test("a note scheduled from the composer waits under it until it is canceled", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await composer.fill("내일 아침에 올릴 노트");
  await page.getByRole("button", { name: "예약", exact: true, pressed: false }).click();
  await expect(page.getByLabel("올릴 때")).toBeVisible();
  await page.getByRole("button", { name: "예약", exact: true, pressed: false }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" })
    .getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  await expectOnTop(toastBy(page, /에 올릴게요$/));
  await expect(composer).toHaveValue("");

  const panel = page.getByRole("button", { name: /예약한 노트 2/ });
  await panel.click();
  await expect(page.getByText("답글을 달 노트가 삭제됐어요")).toBeVisible();
  const mine = page.getByRole("listitem").filter({ hasText: "내일 아침에 올릴 노트" });
  await expect(mine).toBeVisible();
  await mine.getByRole("button", { name: "취소" }).click();
  await expect(mine).toHaveCount(0);
  await expect(page.getByRole("button", { name: /예약한 노트 1/ })).toBeVisible();
});

test("a note with a link shows its card, and the composer previews one while typing", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const seed = page.locator('article[data-note-id="3"]');
  const card = seed.locator("a[data-note-link-card]");
  await expect(card).toHaveAttribute("href", "https://kurl.me/about", { timeout: 30_000 });
  await expect(card).toContainText("kurl — 짧은 링크와 글이 오래 사는 곳");
  await expect(card).toContainText("kurl.me");

  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await composer.fill("읽어 볼 글 https://example.com/essay.");
  const draftCard = page.locator("div[data-note-link-card]");
  await expect(draftCard).toContainText("example.com");
  await page.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").filter({ hasText: "노트는 다른 서버에도 전해져요" })
    .getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  const posted = page.locator("article").first();
  await expect(posted).toContainText("읽어 볼 글");
  await expect(posted.locator("a[data-note-link-card]")).toHaveAttribute("href", "https://example.com/essay");
  await expect(draftCard).toHaveCount(0);
});

test("note notices group likes from any server, open the note, and send a remote follower to their server", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  const likes = page.getByRole("link", { name: /alice@mastodon\.social님 외 3명이 내 노트를 좋아해요/ });
  await expect(likes).toBeVisible({ timeout: 30_000 });
  await expect(likes).toHaveAttribute("href", /\/p\/dohyun\/notes\/2$/);
  const reply = page.getByRole("link", { name: /yuna님이 내 노트에 답글을 남겼어요/ });
  await expect(reply).toHaveAttribute("href", /\/p\/yuna\/notes\/3$/);
  const mention = page.getByRole("link", { name: /yuna님이 노트에서 나를 언급했어요/ });
  await expect(mention).toHaveAttribute("href", /\/p\/yuna\/notes\/5$/);
  const follow = page.getByRole("link", { name: /bob@fosstodon\.org님이 다른 서버에서 나를 팔로우했어요/ });
  await expect(follow).toHaveAttribute("href", "https://fosstodon.org/@bob");
  await expect(follow).toHaveAttribute("target", "_blank");
  const posted = page.getByRole("link", { name: /yuna님이 새 노트를 올렸어요/ });
  await expect(posted).toHaveAttribute("href", /\/p\/yuna\/notes\/6$/);
  const edited = page.getByRole("link", { name: /yuna님이 내가 리포스트하거나 인용한 노트를 수정했어요/ });
  await expect(edited).toHaveAttribute("href", /\/p\/yuna\/notes\/5$/);
});

test("the other servers tab shows notes this server received, and only those", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  await openMoreFeed(page, "다른 서버");
  await expect(page).toHaveURL(/feed=federated/);
  await expect(page.getByRole("button", { name: "다른 서버" })).toBeVisible();
  await expect(page.locator('article[data-note-id="12"]')).toContainText("Hello from the fediverse");
  await expect(page.locator('article[data-note-id="13"]')).toBeVisible();
  await expect(page.locator('article[data-note-id="5"]')).toHaveCount(0);
});

test("beside the feed, trending hashtags show who used them this week and open their notes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ko/blog/notes");
  const rail = page.getByTestId("trending-note-tags");
  await expect(rail.getByRole("heading", { name: "뜨는 해시태그" })).toBeVisible({ timeout: 30_000 });
  const walk = rail.getByRole("link", { name: /#산책/ });
  await expect(walk).toContainText("3명이 이번 주에 썼어요");
  await walk.click();
  await expect(page).toHaveURL(/\/tags\/.+view=notes/);
});

test("beside the feed, trending links show who shared them this week and open the notes carrying them", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ko/blog/notes");
  const rail = page.getByTestId("trending-note-links");
  await expect(rail.getByRole("heading", { name: "뜨는 링크" })).toBeVisible({ timeout: 30_000 });
  const about = rail.getByRole("link", { name: /짧은 링크와 글이 오래 사는 곳/ });
  await expect(about).toContainText("kurl.me");
  await expect(about).toContainText("3명이 이번 주에 공유했어요");
  await expect(rail.getByRole("link", { name: /example\.org/ })).toBeVisible();
  await about.click();
  await expect(page).toHaveURL(/\/notes\/link\?url=https%3A%2F%2Fkurl\.me%2Fabout/);
  const link = page.getByTestId("linked-notes-link");
  await expect(link).toHaveAttribute("href", "https://kurl.me/about");
  await expect(link).toContainText("짧은 링크와 글이 오래 사는 곳");
  await expect(page.locator('article[data-note-id="3"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('article[data-note-id="10"]')).toHaveCount(0);
});

test("a link page refuses to link out to anything but the web", async ({ page }) => {
  await page.goto("/ko/blog/notes/link?url=javascript%3Aalert(1)");
  await expect(page.getByRole("heading", { name: "링크", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("linked-notes-link")).toHaveCount(0);
  await expect(page.getByText("아직 이 링크를 실은 노트가 없어요")).toBeVisible();
});

test("the notes feed has tabs: trending ranks by reactions, following carries reposts with who reposted", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const tabs = page.getByRole("navigation").filter({ hasText: "최신" });
  await expect(tabs.getByRole("link", { name: "최신" })).toHaveAttribute("aria-current", "page", { timeout: 30_000 });
  await expect(tabs.getByRole("link")).toHaveText(["팔로잉", "최신", "인기"]);
  await tabs.getByRole("link", { name: "인기" }).click();
  await expect(page).toHaveURL(/feed=trending/);
  await expect(tabs.getByRole("link", { name: "인기" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "팔로잉" }).click();
  await expect(page).toHaveURL(/feed=following/);
  await expect(page.getByText("yuna님이 리포스트함")).toBeVisible({ timeout: 15_000 });
});

test("the following tab turns every repost off and back on", async ({ page }) => {
  await page.goto("/ko/blog/notes?feed=following");
  const reposted = page.getByText("yuna님이 리포스트함");
  await expect(reposted).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "더 보기" }).click();
  const toggle = page.getByRole("menuitemcheckbox", { name: "리포스트 보기" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(reposted).toHaveCount(0);
  await expect(page.getByText("오늘 쓴 글의 씨앗", { exact: false })).toBeVisible();
  await toggle.click();
  await expect(reposted).toBeVisible();
});

test("a followed author's profile menu hides just their reposts", async ({ page }) => {
  await page.goto("/ko/p/minji");
  const menu = page.getByRole("button", { name: "프로필 메뉴" });
  await expect(page.getByRole("heading", { name: "@minji" })).toBeVisible({ timeout: 30_000 });
  await menu.click();
  await expect(page.getByRole("menuitem", { name: "리스트에 추가…" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "리포스트 숨기기" })).toHaveCount(0);
  await menu.click();
  await page.getByRole("button", { name: "팔로우", exact: true }).click();
  await menu.click();
  await page.getByRole("menuitem", { name: "리포스트 숨기기" }).click();
  await expectOnTop(toastBy(page, "팔로잉 피드에서 minji님의 리포스트를 숨겨요"));
  await menu.click();
  await expect(page.getByRole("menuitem", { name: "리포스트 다시 보기" })).toBeVisible();
});

test("the bell beside following tells of every new note and leaves with the follow", async ({ page }) => {
  await page.goto("/ko/p/minji");
  await expect(page.getByRole("heading", { name: "@minji" })).toBeVisible({ timeout: 30_000 });
  const ring = page.getByRole("button", { name: "새 노트 알림 켜기" });
  await expect(ring).toHaveCount(0);
  await page.getByRole("button", { name: "팔로우", exact: true }).click();
  await expect(ring).toHaveAttribute("aria-pressed", "false");
  await ring.click();
  await expectOnTop(toastBy(page, "새 노트를 올리면 알려 드릴게요"));
  const silence = page.getByRole("button", { name: "새 노트 알림 끄기" });
  await expect(silence).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "팔로잉", exact: true, pressed: true }).click();
  await expect(silence).toHaveCount(0);
  await expect(ring).toHaveCount(0);
});

test("blocking a server from its account's menu hides the account until it is unblocked", async ({ page }) => {
  await page.goto("/ko/blog/remote/9800");
  await expect(page.getByRole("heading", { name: "Mina" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "계정 메뉴" }).click();
  await page.getByRole("menuitem", { name: "mastodon.social 차단" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("한 사람만 문제라면 차단이나 뮤트로 충분해요");
  await dialog.getByRole("button", { name: "서버 차단" }).click();
  await expect(page.getByText("차단한 서버예요")).toBeVisible();
  await expect(page.getByRole("button", { name: "팔로잉", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "mastodon.social 차단 해제" }).click();
  await expect(page.getByText("차단한 서버예요")).toHaveCount(0);
  await expectOnTop(toastBy(page, "mastodon.social 차단을 해제했어요"));
});

test("blog settings choose the note languages shown in all notes", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const section = page.getByRole("region", { name: "보이는 노트 언어" });
  await expect(section).toBeVisible({ timeout: 30_000 });
  const all = section.getByRole("checkbox", { name: "모든 언어" });
  await expect(all).toBeChecked();
  await section.getByText("日本語", { exact: true }).click();
  await expect(section.getByRole("checkbox", { name: "日本語" })).toBeChecked();
  await expect(all).not.toBeChecked();
  await section.getByText("모든 언어", { exact: true }).click();
  await expect(section.getByRole("checkbox", { name: "日本語" })).not.toBeChecked();
});

test("the composer writes in a chosen language", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  await page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" }).click({ timeout: 30_000 });
  const language = page.getByRole("combobox", { name: "노트 언어" });
  await expect(language).toHaveValue("ko", { timeout: 30_000 });
  await language.selectOption("en");
  await expect(language).toHaveValue("en");
});

test("blog settings list blocked servers", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const section = page.getByRole("region", { name: "차단한 서버" });
  await expect(section).toBeVisible({ timeout: 30_000 });
  await expect(section.getByText("차단한 서버가 없어요.")).toBeVisible();
});

test("a hashtag in a note opens the tag on its notes tab, beside the tag's posts", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/5");
  const tag = page.getByRole("link", { name: "#산책" }).first();
  await expect(tag).toBeVisible({ timeout: 30_000 });
  await tag.click();
  await expect(page).toHaveURL(/view=notes/, { timeout: 30_000 });
  const tabs = page.getByRole("navigation").filter({ hasText: "노트" }).last();
  await expect(tabs.getByRole("link", { name: "노트", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator('article[data-note-id="5"]')).toBeVisible({ timeout: 15_000 });
  await tabs.getByRole("link", { name: "글", exact: true }).click();
  await expect(page).not.toHaveURL(/view=notes/);
  await expect(page.locator('article[data-note-id="5"]')).toHaveCount(0);
});

test("a reply's @mention of a member links to their notes, and an unknown handle stays text", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/3");
  const mention = page.getByRole("link", { name: "@yuna", exact: true });
  await expect(mention).toBeVisible({ timeout: 30_000 });
  await mention.click();
  await expect(page).toHaveURL(/\/yuna\/notes$/, { timeout: 30_000 });
});

test("a content warning folds the note until opened, and a sensitive photo stays covered until tapped", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const warned = page.locator('article[data-note-id="7"]');
  await expect(warned.getByText("영화 결말 이야기")).toBeVisible({ timeout: 30_000 });
  await expect(warned.getByText("돌아오지 않는다", { exact: false })).toHaveCount(0);
  await warned.getByRole("button", { name: "내용 보기" }).click();
  await expect(warned.getByText("돌아오지 않는다", { exact: false })).toBeVisible();

  const covered = page.locator('article[data-note-id="8"]');
  await expect(covered.getByRole("img", { name: "꿰맨 자리" })).toHaveCount(0);
  await covered.getByRole("button", { name: "민감한 사진 · 눌러서 보기" }).click();
  await expect(covered.getByRole("img", { name: "꿰맨 자리" }).first()).toBeVisible();
});

test("the composer sends a content warning, and the new note arrives folded", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await composer.fill("범인은 집사였다");
  await page.getByRole("button", { name: "열람 주의", exact: true }).click();
  await page.getByRole("textbox", { name: "열람 주의 문구" }).fill("추리소설 결말");
  await page.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  const posted = page.locator("article").first();
  await expect(posted.getByText("추리소설 결말")).toBeVisible();
  await expect(posted.getByText("범인은 집사였다")).toHaveCount(0);
});

test("pinning my note moves it to the top of my profile under a pinned line", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes");
  const older = page.locator('article[data-note-id="1"]');
  await expect(older).toBeVisible({ timeout: 30_000 });
  await older.getByRole("button", { name: "메뉴" }).click();
  await page.getByRole("menuitem", { name: "프로필에 고정" }).click();
  await expectOnTop(toastBy(page, "프로필에 고정했어요"));
  const first = page.locator("article[data-note-id]").first();
  await expect(first).toHaveAttribute("data-note-id", "1");
  await expect(first.getByText("고정됨")).toBeVisible();
});

test("an edited note opens its edit history from the note page", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes/2");
  const note = page.locator('article[data-note-id="2"]').first();
  await expect(note).toBeVisible({ timeout: 30_000 });
  await note.getByRole("button", { name: "메뉴" }).click();
  await page.getByRole("menuitem", { name: "고치기" }).click();
  await note.getByRole("textbox").fill("블로그 글을 인용해 봤어요. 다시 고쳤어요.");
  await note.getByRole("button", { name: "저장" }).click();
  await note.getByRole("button", { name: "고침" }).click();
  const dialog = page.getByRole("dialog", { name: "수정 기록" });
  await expect(dialog.locator("[data-note-version]")).toHaveCount(2);
  await expect(dialog.locator('[data-note-version="1"]')).toContainText("블로그 글을 인용해 봤어요.");
  await expect(dialog.locator('[data-note-version="0"]')).toContainText("다시 고쳤어요.");
});

test("editing my note puts a content warning on it and takes it off again", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes/2");
  const note = page.locator('article[data-note-id="2"]').first();
  await expect(note).toBeVisible({ timeout: 30_000 });
  await note.getByRole("button", { name: "메뉴" }).click();
  await page.getByRole("menuitem", { name: "고치기" }).click();
  await note.getByRole("button", { name: "열람 주의", exact: true }).click();
  await note.getByRole("textbox", { name: "열람 주의 문구" }).fill("인용 이야기");
  await note.getByRole("button", { name: "저장" }).click();
  await expect(note.locator("[data-note-warning]")).toContainText("인용 이야기");
  await expect(note.getByText("블로그 글을 인용해 봤어요.")).toHaveCount(0);

  await note.getByRole("button", { name: "메뉴" }).click();
  await page.getByRole("menuitem", { name: "고치기" }).click();
  await expect(note.getByRole("textbox", { name: "열람 주의 문구" })).toHaveValue("인용 이야기");
  await note.getByRole("button", { name: "열람 주의", exact: true }).click();
  await note.getByRole("button", { name: "저장" }).click();
  await expect(note.locator("[data-note-warning]")).toHaveCount(0);
  await expect(note.getByText("블로그 글을 인용해 봤어요.")).toBeVisible();
});

test("editing my note with a photo marks the photo sensitive", async ({ page }) => {
  await page.goto("/ko/p/dohyun/notes/1");
  const note = page.locator('article[data-note-id="1"]').first();
  await expect(note.getByRole("img", { name: "비 오는 창밖" }).first()).toBeVisible({ timeout: 30_000 });
  await note.getByRole("button", { name: "메뉴" }).click();
  await page.getByRole("menuitem", { name: "고치기" }).click();
  await note.getByRole("button", { name: "민감한 사진으로 표시" }).click();
  await note.getByRole("button", { name: "저장" }).click();
  await expect(note.getByRole("button", { name: "민감한 사진 · 눌러서 보기" })).toBeVisible();
  await expect(note.getByRole("img", { name: "비 오는 창밖" })).toHaveCount(0);
});

test("private mentions have their own tab, stay out of all notes, and can't be reposted", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  await expect(page.locator("article[data-note-id]").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('article[data-note-id="9"]')).toHaveCount(0);
  await openMoreFeed(page, "개인 멘션");
  await expect(page).toHaveURL(/feed=direct/);
  const dm = page.locator('article[data-note-id="9"]');
  await expect(dm).toBeVisible({ timeout: 15_000 });
  await expect(dm.getByRole("img", { name: "멘션한 사람만" })).toBeVisible();
  await expect(dm.getByRole("img", { name: "리포스트할 수 없는 노트예요" })).toBeVisible();
});

test("the composer posts with the chosen visibility", async ({ page }) => {
  await page.goto("/ko/blog/notes?feed=following");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await composer.fill("팔로워에게만 하는 말");
  await page.getByRole("combobox", { name: "공개 범위" }).selectOption("private");
  await page.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  const posted = page.locator("article").first();
  await expect(posted).toContainText("팔로워에게만 하는 말");
  await expect(posted.getByRole("img", { name: "팔로워만" })).toBeVisible();
});

test("a person added to a list from their profile fills that list's tab", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const byYuna = page.locator("article[data-note-id]").filter({ has: page.getByRole("link", { name: "@yuna", exact: true }) });
  await byYuna.first().getByRole("link", { name: "@yuna", exact: true }).first().click({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "@yuna" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "프로필 메뉴" }).click();
  await page.getByRole("menuitem", { name: "리스트에 추가…" }).click();
  const dialog = page.getByRole("dialog", { name: "리스트에 추가" });
  await dialog.getByRole("textbox", { name: "새 리스트 이름" }).fill("동료");
  await dialog.getByRole("button", { name: "만들고 담기" }).click();
  await expect(dialog.getByRole("menuitemcheckbox", { name: "동료" })).toHaveAttribute("aria-checked", "true");
  await expect(dialog).toContainText("yuna님에게 알리지 않아요");
  await dialog.getByRole("button", { name: "닫기" }).click();

  await page.goBack();
  await openMoreFeed(page, "동료");
  await expect(page).toHaveURL(/feed=lists&list=\d+/);
  await expect(page.getByRole("button", { name: "노트 피드 더 보기: 동료" })).toBeVisible();
  const list = page.getByRole("region", { name: "동료" });
  await expect(list.locator("article[data-note-id]").first()).toContainText("yuna", { timeout: 15_000 });
  await expect(list.locator("article[data-note-id]").filter({ hasText: "dohyun" })).toHaveCount(0);

  await list.getByRole("link", { name: "리스트 관리" }).click();
  await expect(page).toHaveURL(/\/settings#lists$/, { timeout: 30_000 });
  const managed = page.getByRole("region", { name: "리스트" }).getByRole("listitem", { name: "동료" });
  await managed.getByRole("button", { name: "1명" }).click({ timeout: 30_000 });
  await managed.getByRole("button", { name: "빼기" }).click();
  await expect(managed.getByRole("button", { name: "0명" })).toBeVisible();
});

test("an old list link with no list picked points to where lists are managed", async ({ page }) => {
  await page.goto("/ko/blog/notes?feed=lists");
  await expect(page.getByRole("link", { name: "리스트 관리" })).toHaveAttribute("href", /\/settings#lists$/, { timeout: 30_000 });
});

test("a bookmark from a note's menu shows under the bookmarks tab", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const first = page.locator("article[data-note-id]").first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  const id = await first.getAttribute("data-note-id");
  await first.getByRole("button", { name: "메뉴" }).click();
  await page.getByRole("menuitem", { name: "북마크" }).click();
  await expectOnTop(toastBy(page, "북마크에 넣었어요"));
  await openMoreFeed(page, "북마크");
  await expect(page).toHaveURL(/feed=bookmarks/);
  await expect(page.locator(`article[data-note-id="${id}"]`)).toBeVisible({ timeout: 15_000 });
});

test("a note page heads the note with the author's fediverse handle and a follow button", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/5");
  const note = page.locator('article[data-note-id="5"]').first();
  await expect(note.getByText("@yuna@kurl.me")).toBeVisible({ timeout: 30_000 });
  await expect(note.getByRole("button", { name: "팔로우", exact: true })).toBeVisible();
});

test("a note page counts its quotes, a blog post that carries it among them, and lists them", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/5");
  const quotes = page.getByRole("link", { name: "인용 2" });
  await expect(quotes).toBeVisible({ timeout: 30_000 });
  await quotes.click();
  await expect(page).toHaveURL(/\/notes\/5\/quotes/);
  await expect(page.getByRole("heading", { name: "인용", exact: true })).toBeVisible();
  await expect(page.getByText("이 사진들 보고 나도 오늘 걸었다.")).toBeVisible();
});

test("voting in a poll reveals the results with the reader's choice", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const poll = page.locator('[data-note-poll="10"]');
  await expect(poll.getByRole("button", { name: "국밥" })).toBeVisible({ timeout: 30_000 });
  await expect(poll.locator("[data-poll-result]")).toHaveCount(0);
  await poll.getByRole("button", { name: "결과 보기" }).click();
  await expect(poll.locator('[data-poll-result="0"]')).toContainText("56%");
  await poll.getByRole("button", { name: "투표로 돌아가기" }).click();
  await poll.getByRole("button", { name: "국밥" }).click();
  await expect(poll.locator('[data-poll-result="0"]')).toContainText("60%");
  await expect(poll.locator('[data-poll-result="0"]').getByLabel("내 선택")).toBeVisible();
  await expect(poll).toContainText("10명 참여");
  await expect(poll.getByRole("button", { name: "결과 보기" })).toHaveCount(0);
});

test("the composer posts a poll, and photos and a poll exclude each other", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await composer.fill("점심 투표");
  await page.getByRole("button", { name: "투표 추가" }).click();
  await expect(page.getByRole("button", { name: "사진 추가" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "올리기" })).toBeDisabled();
  await handPhoto(composer, "paste");
  await expect(page.getByText("노트 하나에는 투표나 사진 중 하나만 담을 수 있어요")).toBeVisible();
  await handPhoto(composer, "drop");
  await expect(page.getByRole("button", { name: "사진 빼기" })).toHaveCount(0);
  await page.getByRole("textbox", { name: "선택지 1" }).fill("국밥");
  await page.getByRole("textbox", { name: "선택지 2" }).fill("국밥");
  await expect(page.getByRole("button", { name: "올리기" })).toBeDisabled();
  await page.getByRole("textbox", { name: "선택지 2" }).fill("파스타");
  await page.getByRole("button", { name: "선택지 추가" }).click();
  await page.getByRole("textbox", { name: "선택지 3" }).fill("샐러드");
  await page.getByRole("combobox", { name: "기간" }).selectOption("3600");
  await page.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  const posted = page.locator("article").first();
  await expect(posted).toContainText("점심 투표");
  await expect(posted.locator('[data-poll-result="2"]')).toContainText("샐러드");
  await expect(posted).toContainText("0명 참여");
});

test("muting someone from their profile menu takes their notes out of the feed", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const yunaNotes = page.locator("article[data-note-id]").filter({ has: page.getByRole("link", { name: "@yuna", exact: true }) });
  await expect(yunaNotes.first()).toBeVisible({ timeout: 30_000 });
  await yunaNotes.first().getByRole("link", { name: "@yuna", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "@yuna" })).toBeVisible({ timeout: 30_000 });
  const menu = page.getByRole("button", { name: "프로필 메뉴" });
  await menu.click();
  await page.getByRole("menuitem", { name: "뮤트…" }).click();
  const dialog = page.getByRole("dialog", { name: "yuna님 뮤트" });
  await expect(dialog.getByRole("checkbox", { name: "알림도 숨기기" })).toBeChecked();
  await dialog.getByRole("combobox", { name: "기간" }).selectOption("86400");
  await dialog.getByRole("button", { name: "뮤트", exact: true }).click();
  await expectOnTop(toastBy(page, "yuna님을 뮤트했어요"));
  await menu.click();
  await expect(page.getByRole("menuitem", { name: "뮤트 해제" })).toBeVisible();
  await menu.click();

  await page.goBack();
  await expect(page.locator('article[data-note-id="6"]')).toBeVisible({ timeout: 30_000 });
  for (const id of [3, 5, 10]) await expect(page.locator(`article[data-note-id="${id}"]`)).toHaveCount(0);
});

test("a keyword filter from settings folds matching notes until shown, and hiding drops them", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const section = page.getByRole("region", { name: "키워드 필터" });
  await section.getByRole("textbox", { name: "키워드나 문구" }).fill("씨앗", { timeout: 30_000 });
  await section.getByRole("button", { name: "필터 추가" }).click();
  await expect(section.getByRole("button", { name: "씨앗 필터 고치기" })).toBeVisible();

  await page.goto("/ko/blog/notes");
  const folded = page.locator('article[data-note-id="3"]');
  await expect(folded).toContainText("필터됨: 씨앗", { timeout: 30_000 });
  await folded.getByRole("button", { name: "보기" }).click();
  await expect(folded).toContainText("오늘 쓴 글의 씨앗");

  await page.goto("/ko/blog/settings");
  await section.getByRole("button", { name: "씨앗 필터 고치기" }).click({ timeout: 30_000 });
  await section.getByRole("combobox", { name: "걸리면" }).selectOption("hide");
  await section.getByRole("button", { name: "저장" }).click();
  await page.goto("/ko/blog/notes");
  await expect(page.locator('article[data-note-id="6"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('article[data-note-id="3"]')).toHaveCount(0);
});

test("a search has a notes tab that finds public notes by their words", async ({ page }) => {
  await page.goto("/ko/blog?q=%EC%94%A8%EC%95%97");
  await page.getByRole("link", { name: "노트", exact: true }).last().click({ timeout: 30_000 });
  await expect(page).toHaveURL(/view=notes/);
  await expect(page.locator('article[data-note-id="3"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('article[data-note-id="9"]')).toHaveCount(0);
});


test("a display name leads the note header with the handle beside it, and settings saves one", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const haruka = page.locator('article[data-note-id="11"]');
  await expect(haruka.getByRole("link", { name: "하루카 @haruka" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('article[data-note-id="6"]').getByRole("link", { name: "@dohyun", exact: true })).toBeVisible();

  await page.goto("/ko/blog/settings");
  const field = page.getByRole("textbox", { name: "표시 이름" });
  await field.fill("  도현  ", { timeout: 30_000 });
  const save = page.locator("form").filter({ has: field }).getByRole("button", { name: "저장" });
  await save.click();
  await expectOnTop(toastBy(page, "표시 이름을 바꿨어요"));
  await expect(field).toHaveValue("도현");
  await expect(save).toBeDisabled();
});

test("a handle in search finds an account on another server, and following it sends a request", async ({ page }) => {
  await page.goto("/ko/blog?q=%40alice%40mastodon.social");
  const found = page.getByRole("region", { name: "다른 서버 계정" });
  await expect(found.getByText("@alice@mastodon.social")).toBeVisible({ timeout: 30_000 });
  const follow = found.getByRole("button", { name: "팔로우" });
  await follow.click();
  await expect(found.getByRole("button", { name: "요청됨" })).toBeVisible();

  await found.getByRole("link", { name: /Alice/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Alice" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "팔로잉" })).toBeVisible();
  await expect(page.getByText("mastodon.social에 있는 계정이에요. 이 계정의 새 노트가 팔로잉 피드에 와요.")).toBeVisible();
});

test("a note from a followed account elsewhere reaches the following tab and opens its account", async ({ page }) => {
  await page.goto("/ko/blog/notes?feed=following");
  const remote = page.locator('article[data-note-id="12"]');
  await expect(remote).toContainText("Hello from the fediverse", { timeout: 30_000 });
  await expect(page.locator('article[data-note-id="12"]')).toHaveCount(1);
  await remote.getByRole("link", { name: "Mina @mina@mastodon.social" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mina" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('article[data-note-id="12"]')).toBeVisible();

  await page.goto("/ko/blog/notes");
  await expect(page.locator('article[data-note-id="6"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('article[data-note-id="12"]')).toHaveCount(0);
});

test("a note's menu mutes and unmutes its conversation", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const seed = page.locator('article[data-note-id="3"]');
  await expect(seed).toBeVisible({ timeout: 30_000 });
  await seed.getByRole("button", { name: "노트 메뉴" }).click();
  await seed.getByRole("menuitem", { name: "대화 알림 끄기" }).click();
  await expectOnTop(toastBy(page, "이 대화의 알림을 껐어요"));
  await seed.getByRole("button", { name: "노트 메뉴" }).click();
  await expect(seed.getByRole("menuitem", { name: "대화 알림 켜기" })).toBeVisible();
});

test("a note page reports someone else's note with a reason", async ({ page }) => {
  await page.goto("/ko/p/yuna/notes/3");
  const report = page.getByRole("button", { name: "신고", exact: true }).first();
  await report.click({ timeout: 30_000 });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox", { name: /에도 전달/ })).toHaveCount(0);
  await dialog.getByLabel("스팸·광고").check();
  await dialog.getByRole("button", { name: "신고", exact: true }).click();
  await expectOnTop(toastBy(page, "신고가 접수됐어요."));
});

test("a note from another server can be reported to that server too, off unless chosen", async ({ page }) => {
  await page.goto("/ko/blog/remote/9800/notes/12");
  const report = page.getByRole("button", { name: "신고", exact: true }).first();
  await report.click({ timeout: 30_000 });
  const dialog = page.getByRole("dialog");
  const forward = dialog.getByRole("checkbox", { name: /mastodon\.social에도 전달/ });
  await expect(forward).not.toBeChecked();
  await forward.check();
  await dialog.getByLabel("스팸·광고").check();
  await dialog.getByRole("button", { name: "신고", exact: true }).click();
  await expectOnTop(toastBy(page, "신고가 접수됐어요."));
});

test("video and audio from another server play in place with their own controls", async ({ page }) => {
  await page.goto("/ko/blog/remote/9800");
  const waves = page.locator('article[data-note-id="13"]');
  await expect(waves.locator("video")).toHaveAttribute("src", "https://files.mastodon.social/waves.mp4", {
    timeout: 30_000,
  });
  await expect(waves.locator("audio")).toHaveAttribute("controls", "");
  await expect(waves.locator("video")).toHaveAttribute("aria-label", "밀려오는 파도");
});

test("a video plays silently while mostly on screen and stops when it leaves", async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { mediaCalls: string[] }).mediaCalls = calls;
    HTMLMediaElement.prototype.play = function () {
      calls.push(`play:${this.tagName}:${this.muted}`);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      calls.push(`pause:${this.tagName}`);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog/remote/9800");
  const video = page.locator('article[data-note-id="13"] video');
  await expect(video).toHaveAttribute("loop", "", { timeout: 30_000 });
  await video.scrollIntoViewIfNeeded();
  const calls = () => page.evaluate(() => (window as unknown as { mediaCalls: string[] }).mediaCalls);
  await expect.poll(calls).toContain("play:VIDEO:true");
  // Less than half of it on screen: the page here is short, so shrink the window instead of scrolling.
  await page.setViewportSize({ width: 390, height: 120 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(calls).toContain("pause:VIDEO");
  expect((await calls()).some((call) => call.startsWith("play:AUDIO"))).toBe(false);
});

test("with reduced motion a video waits for the reader to press play", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { mediaCalls: string[] }).mediaCalls = calls;
    HTMLMediaElement.prototype.play = function () {
      calls.push("play");
      return Promise.resolve();
    };
  });
  await page.goto("/ko/blog/remote/9800");
  const video = page.locator('article[data-note-id="13"] video');
  await expect(video).toBeVisible({ timeout: 30_000 });
  await video.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as unknown as { mediaCalls: string[] }).mediaCalls)).toEqual([]);
});

test("beside the feed, follow suggestions offer a follow and can be set aside", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ko/blog/notes");
  const rail = page.getByTestId("follow-suggestions");
  await expect(rail.getByRole("heading", { name: "팔로우 추천" })).toBeVisible({ timeout: 30_000 });
  await expect(rail.getByTestId("suggestion-haruka")).toContainText("내가 팔로우하는 3명이 팔로우");
  await expect(rail.getByTestId("suggestion-yuna")).toContainText("요즘 많이 팔로우해요");
  await rail.getByTestId("suggestion-dismiss-minji").click();
  await expect(rail.getByTestId("suggestion-minji")).toHaveCount(0);
  await expect(rail.getByTestId("suggestion-haruka").getByTestId("follow-button")).toHaveText("팔로우");
});

test("a picture whose size the server knows holds its shape before it loads", async ({ page }) => {
  await page.route(/picsum\.photos/, (route) => route.abort());
  await page.goto("/ko/blog/notes");
  // The quoted-note card shows the same picture as a fixed 64px square; the strip is the one that keeps its shape.
  const tall = page.locator('img[alt="골목 끝에 선 가로등"][width]').first();
  await expect(tall).toBeVisible({ timeout: 30_000 });
  await expect(tall).toHaveAttribute("width", "600");
  await expect(tall).toHaveAttribute("height", "800");
  const box = await tall.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width / box!.height).toBeCloseTo(600 / 800, 1);
});

// The chain itself (each note answering the one before) is the server's job and is covered there; a note
// made in the mock lives only in this tab, so its own page cannot be opened here.
test("a thread is written in one go and its first note leads the feed", async ({ page }) => {
  await page.goto("/ko/blog/notes");
  const composer = page.getByRole("textbox", { name: "지금 떠오른 생각을 짧게 남겨 보세요" });
  await expect(composer).toBeVisible({ timeout: 30_000 });
  await composer.fill("이어 쓰기 첫 노트");
  await page.getByRole("button", { name: "스레드에 추가" }).click();
  const part = page.getByRole("textbox", { name: "이어서 써 보세요" });
  await expect(part).toBeFocused();
  await part.fill("이어 쓰기 둘째 노트");
  await expect(page.getByRole("button", { name: "예약", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "올리기" }).click();
  const notice = page.getByRole("dialog");
  await expect(notice).toContainText("노트는 다른 서버에도 전해져요");
  await notice.getByRole("button", { name: "알겠어요, 올릴게요" }).click();

  await expect(page.locator("article").first()).toContainText("이어 쓰기 첫 노트");
  await expect(part).toHaveCount(0);
  await expect(composer).toHaveValue("");
});
