import { expect, test, type Page } from "@playwright/test";

const signOut = (page: Page) =>
  page.addInitScript(() => window.localStorage.setItem("kurl:mock-signed-out", "1"));

const elsewhere = (page: Page) => page.getByRole("region", { name: "다른 서버" });

test("a name search lists people on other servers under the people here", async ({ page }) => {
  await page.goto("/ko/blog?q=har&view=people");
  await expect(page.getByTestId("person-haruka")).toBeVisible({ timeout: 30_000 });
  const row = elsewhere(page).getByTestId("remote-account-haruto@misskey.io");
  await expect(row).toContainText("@haruto@misskey.io");
  await expect(row.getByRole("link")).toHaveAttribute("href", /\/remote\/9801$/);
  const here = await page.getByTestId("person-haruka").boundingBox();
  const there = await row.boundingBox();
  expect(there!.y).toBeGreaterThan(here!.y);

  await row.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: "Haruto" })).toBeVisible({ timeout: 30_000 });
});

test("a name with no match elsewhere says how to find someone there", async ({ page }) => {
  await page.goto("/ko/blog?q=zz&view=people");
  await expect(page.getByRole("heading", { level: 2, name: "맞는 사람이 없어요" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("다른 서버 사람은 @아이디@서버 주소로 찾을 수 있어요")).toBeVisible();
  await expect(elsewhere(page)).toHaveCount(0);
});

test("the people tab stays as it was when the other-server search fails", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail", "remote-search"));
  await page.goto("/ko/blog?q=har&view=people");
  await expect(page.getByTestId("person-haruka")).toBeVisible({ timeout: 30_000 });
  await expect(elsewhere(page)).toHaveCount(0);
  await expect(page.getByText("다른 서버 사람은 @아이디@서버 주소로 찾을 수 있어요")).toHaveCount(0);
});

test("an address of a note elsewhere shows that note on top, and opens it", async ({ page }) => {
  await page.goto(`/ko/blog?q=${encodeURIComponent("https://mastodon.social/@mina/12")}`);
  const note = elsewhere(page).locator('article[data-note-id="12"]');
  await expect(note).toContainText("Hello from the fediverse", { timeout: 30_000 });
  await note.getByText("Hello from the fediverse").click();
  await expect(page).toHaveURL(/\/remote\/9800\/notes\/12$/, { timeout: 30_000 });
});

test("a handle the server does not know, and a server that does not answer, are told apart", async ({ page }) => {
  await page.goto(`/ko/blog?q=${encodeURIComponent("@nobody@mastodon.social")}`);
  await expect(elsewhere(page)).toContainText("mastodon.social 서버에서 찾지 못했어요", { timeout: 30_000 });

  await page.goto(`/ko/blog?q=${encodeURIComponent("@mina@down.example")}`);
  await expect(elsewhere(page)).toContainText("down.example 서버가 응답하지 않아요", { timeout: 30_000 });
});

test("signed out, a handle asks to sign in", async ({ page }) => {
  await signOut(page);
  await page.goto(`/ko/blog?q=${encodeURIComponent("@mina@mastodon.social")}`);
  const block = elsewhere(page);
  await expect(block).toContainText("다른 서버 사람 찾기는 로그인하면 돼요", { timeout: 30_000 });
  await block.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("dialog", { name: "다른 서버 계정을 찾으려면 로그인하세요" })).toBeVisible();
});

test("signed out, following someone found elsewhere asks to sign in", async ({ page }) => {
  await signOut(page);
  await page.goto("/ko/blog?q=har&view=people");
  const row = elsewhere(page).getByTestId("remote-account-haruto@misskey.io");
  await row.getByRole("button", { name: "팔로우" }).click({ timeout: 30_000 });
  await expect(page.getByRole("dialog", { name: "팔로우하려면 로그인하세요" })).toBeVisible();
});

test("the people tab fits a phone with an account elsewhere in it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ko/blog?q=har&view=people");
  await expect(elsewhere(page).getByTestId("remote-account-haruto@misskey.io")).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a handle or an address shows only what the other server answered, without the post search", async ({ page }) => {
  for (const [query, answer] of [
    ["@alice@mastodon.social", "@alice@mastodon.social"],
    ["https://mastodon.social/@mina/12", "Hello from the fediverse"],
    ["@nobody@mastodon.social", "mastodon.social 서버에서 찾지 못했어요"],
    ["@mina@down.example", "down.example 서버가 응답하지 않아요"],
  ]) {
    await page.goto(`/ko/blog?q=${encodeURIComponent(query)}`);
    await expect(elsewhere(page)).toContainText(answer, { timeout: 30_000 });
    await expect(page.getByText("맞는 글이 없어요")).toHaveCount(0);
    await expect(page.getByText("대신 이런 주제는 어때요")).toHaveCount(0);
  }
});

test("signed out, a handle shows the sign-in line without the post search", async ({ page }) => {
  await signOut(page);
  await page.goto(`/ko/blog?q=${encodeURIComponent("@mina@mastodon.social")}`);
  await expect(elsewhere(page)).toContainText("다른 서버 사람 찾기는 로그인하면 돼요", { timeout: 30_000 });
  await expect(page.getByText("맞는 글이 없어요")).toHaveCount(0);
});

test("the post search comes back when the other server cannot be asked", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("kurl:mock-fail", "remote-resolve"));
  await page.goto(`/ko/blog?q=${encodeURIComponent("https://mastodon.social/@mina/12")}`);
  await expect(page.getByText("맞는 글이 없어요")).toBeVisible({ timeout: 30_000 });
  await expect(elsewhere(page)).toHaveCount(0);
});
