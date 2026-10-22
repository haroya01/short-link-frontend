import { expect, test, type Page } from "@playwright/test";
import { scrollUntilPresent } from "./helpers/scroll-until";

// Mock-on lane: signed in as @dohyun. 홈 is one feed of notes and blog posts in the note row grammar;
// the bar carries 홈 · 방 · 둘러보기 · 알림 · 계정; the old notes feeds land on 홈 or 둘러보기.
test.use({ viewport: { width: 390, height: 844 } });

async function openHome(page: Page, path = "/ko/blog") {
  await page.goto(path);
  const feed = page.getByTestId("home-feed");
  await expect(feed).toBeVisible({ timeout: 30_000 });
  return feed;
}

test("홈 lists notes and blog posts in one feed, a post as a row with the post card and its own reactions", async ({
  page,
}) => {
  const feed = await openHome(page);
  await expect(feed.locator("article[data-note-id]").first()).toBeVisible();
  await scrollUntilPresent(feed.locator("[data-post-id]"));

  const post = feed.locator("[data-post-id]").first();
  const card = post.locator("[data-home-post-body]");
  await expect(card).toContainText("블로그 글");
  await expect(card).toContainText(/\d+분 읽기/);
  expect(await card.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("0px");
  await expect(post.locator("[data-quoted-post-id]")).toHaveCount(0);
  const cover = post.locator("[data-home-post-cover]");
  if (await cover.count()) {
    const [coverBox, bodyBox] = [await cover.boundingBox(), await card.boundingBox()];
    expect(Math.round(coverBox!.width)).toBe(Math.round(bodyBox!.width));
    expect(coverBox!.width / coverBox!.height).toBeCloseTo(16 / 9, 1);
  }
  await expect(post.getByRole("button", { name: "좋아요", exact: true })).toBeVisible();
  await expect(post.getByRole("link", { name: /^댓글 \d+개$/ })).toHaveAttribute("href", /#comments$/);
  await expect(post.getByRole("button", { name: "북마크", exact: true })).toBeVisible();
  await expect(post.getByRole("button", { name: "공유" })).toBeVisible();
  await expect(post.getByRole("button", { name: /리포스트/ })).toHaveCount(0);

  const href = await card.getAttribute("href");
  await card.click();
  await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.?]/g, "\\$&")}$`));
});

test("a post row's heart likes the post and shows the server's count", async ({ page }) => {
  const feed = await openHome(page);
  await scrollUntilPresent(feed.locator("[data-post-id]"));
  const post = feed.locator("[data-post-id]").first();
  await expect(page.locator("header.vt-app-header [data-auth-slot]")).toHaveCount(0);
  await post.getByRole("button", { name: "좋아요", exact: true }).click();
  const liked = post.getByRole("button", { name: "좋아요 취소" });
  await expect(liked).toHaveAttribute("aria-pressed", "true");
  await expect(liked).toHaveText("63");
});

test("최신 keeps the public connection cards, one after the sixth of my rows and then every five, clear of the 맞춤 pairs", async ({
  page,
}) => {
  const feed = await openHome(page);
  const rows = feed.locator(":scope > div > *");
  await expect(feed.getByTestId("home-connection").first()).toBeVisible();
  await expect(feed.locator("[data-remote-mark]").first()).toBeAttached();
  const kids = await rows.evaluateAll((all) =>
    all.map((el) =>
      el.matches("[data-testid=home-connection]") ? "c" : el.matches("[data-remote-uri], [data-remote-kept]") ? "m" : "r",
    ),
  );
  const cards = kids.flatMap((kid, i) => (kid === "c" ? [i] : []));
  const mine = (from: number, to: number) => kids.slice(from, to).filter((kid) => kid === "r").length;
  expect(mine(0, cards[0])).toBe(6);
  cards.slice(1).forEach((at, k) => expect(mine(cards[k], at)).toBe(5));
  kids.forEach((kid, i) => {
    if (kid !== "c") return;
    expect(kids.slice(Math.max(i - 2, 0), i)).not.toContain("m");
    expect(kids.slice(i + 1, i + 3)).not.toContain("m");
  });
  expect(kids.filter((kid) => kid === "m").length).toBeGreaterThan(0);
});

test("a note written in the composer lands at the top of 홈", async ({ page }) => {
  const feed = await openHome(page);
  await page.getByRole("textbox", { name: "노트 쓰기" }).fill("홈에서 쓴 노트");
  await page.getByRole("button", { name: "올리기" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "알겠어요, 올릴게요" }).click();
  await expect(feed.locator("article[data-note-id]").first()).toContainText("홈에서 쓴 노트");
});

test("더 보기 holds 추천, 시리즈 and, on 팔로잉, 리포스트 보기", async ({ page }) => {
  await openHome(page, "/ko/blog?sort=following");
  await page.locator("[data-feed-switcher] [data-feed-more] > button").click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["추천", "시리즈"]);
  await expect(menu.getByRole("menuitemcheckbox", { name: "리포스트 보기" })).toBeVisible();
});

test("the phone bar is 홈 · 방 · 둘러보기 · 알림 · 계정, and 둘러보기 opens /explore", async ({ page }) => {
  await openHome(page);
  const bar = page.locator("nav.vt-bottom-nav");
  await expect(bar.locator(":scope > a, :scope > button")).toHaveText(["홈", "방", "둘러보기", "알림", "계정"]);
  await expect(bar.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
  await bar.getByRole("link", { name: "둘러보기" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator("nav.vt-bottom-nav").getByRole("link", { name: "둘러보기" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the header links read 홈 · 방 · 둘러보기", async ({ page }) => {
    await openHome(page);
    const sections = page.getByRole("banner").getByRole("navigation").first();
    await expect(sections.getByRole("link")).toHaveText(["홈", "방", "둘러보기"]);
    await expect(sections.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
  });
});

test("the old notes feeds land on 홈's matching tab, 다른 서버 on 둘러보기", async ({ page }) => {
  for (const [from, to] of [
    ["/ko/blog/notes", /\/ko\/blog(-preview)?\/?$/],
    ["/ko/blog/notes?feed=following", /\?sort=following$/],
    ["/ko/blog/notes?feed=everyone", /\?sort=recent$/],
    ["/ko/blog/notes?feed=trending", /\?sort=trending$/],
    ["/ko/blog/notes?feed=federated", /\/explore$/],
  ] as const) {
    await page.goto(from);
    await expect(page, from).toHaveURL(to, { timeout: 30_000 });
  }
});

test("노트 북마크, 개인 멘션 and 리스트 stay as their own pages under a title", async ({ page }) => {
  await page.goto("/ko/blog/notes?feed=bookmarks");
  await expect(page.getByRole("heading", { level: 1, name: "노트 북마크" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("[data-feed-switcher]")).toHaveCount(0);
  await page.goto("/ko/blog/notes?feed=direct");
  await expect(page.getByRole("heading", { level: 1, name: "개인 멘션" })).toBeVisible({ timeout: 30_000 });
  await page.goto("/ko/blog/notes?feed=lists");
  await expect(page.getByRole("heading", { level: 1, name: "리스트" })).toBeVisible({ timeout: 30_000 });
});

test("a reader who last used the notes 인기 tab opens 홈 on 인기", async ({ page, context }) => {
  await context.addCookies([{ name: "kurl_notes_feed", value: "trending", url: "http://localhost" }]);
  await openHome(page);
  await expect(page.locator("[data-feed-switcher]").getByRole("link", { name: "인기" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
