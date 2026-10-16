import { test, expect, type Page } from "@playwright/test";
import { expectOnTop } from "./helpers/on-top";

const PASSWORD = "kurl-open";

async function reader(page: Page, { signedOut = true, country }: { signedOut?: boolean; country?: string } = {}) {
  await page.addInitScript(
    ({ signedOut, country }) => {
      window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
      if (signedOut) window.localStorage.setItem("kurl:mock-signed-out", "1");
      else window.localStorage.removeItem("kurl:mock-signed-out");
      if (country) window.localStorage.setItem("kurl:mock-country", country);
    },
    { signedOut, country },
  );
}

const body = (page: Page) => page.locator(".prose-post");
const gate = (page: Page) => page.getByTestId("post-gate");

async function expectNoReadingChrome(page: Page) {
  await expect(body(page)).toHaveCount(0);
  await expect(page.getByTestId("comment-composer-placeholder")).toHaveCount(0);
  await expect(page.getByTestId("post-actions")).toHaveCount(0);
  await expect(page.getByTestId("post-tags")).toHaveCount(0);
}

test.describe("a followers-only post", () => {
  test("an anonymous reader sees the title and a follow gate, never the body", async ({ page }) => {
    await reader(page);
    const html = await (await page.request.get("/ko/p/hana/letters-to-followers")).text();
    expect(html).not.toContain("가까운 사람들에게만 털어놓는 이야기");
    expect(html).not.toContain("소프트 줄바꿈 첫 줄");
    expect(html).toContain('content="noindex, nofollow"');

    await page.goto("/ko/p/hana/letters-to-followers");
    await expect(page.getByRole("heading", { level: 1, name: "팔로워에게만 쓰는 근황" })).toBeVisible({ timeout: 30_000 });
    await expect(gate(page)).toHaveAttribute("data-reason", "FOLLOWERS");
    await expect(gate(page)).toContainText("팔로우하면 읽을 수 있어요");
    await expectNoReadingChrome(page);

    await gate(page).getByRole("button", { name: "팔로우" }).click();
    await expectOnTop(page.getByRole("dialog").filter({ hasText: "팔로우하려면 로그인하세요" }));
  });

  test("a signed-in reader opens it by following", async ({ page }) => {
    await reader(page, { signedOut: false });
    await page.goto("/ko/p/hana/letters-to-followers");
    await expect(gate(page)).toHaveAttribute("data-reason", "FOLLOWERS", { timeout: 30_000 });
    await gate(page).getByRole("button", { name: "팔로우" }).click();
    await expect(body(page)).toContainText("소프트 줄바꿈 첫 줄", { timeout: 10_000 });
    await expect(gate(page)).toHaveCount(0);
    await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible();
  });
});

test.describe("a password post", () => {
  test("a wrong password keeps the gate, the right one opens the post for the tab", async ({ page }) => {
    await reader(page);
    await page.goto("/ko/p/hana/locked-diary");
    await expect(gate(page)).toHaveAttribute("data-reason", "PASSWORD", { timeout: 30_000 });
    await expect(gate(page)).toContainText("비밀번호가 걸린 글이에요");
    await expectNoReadingChrome(page);

    const field = gate(page).getByLabel("비밀번호", { exact: true });
    await field.fill("not-it");
    await gate(page).getByRole("button", { name: "열기" }).click();
    await expect(gate(page).getByRole("alert")).toHaveText("비밀번호가 맞지 않아요");
    await expect(body(page)).toHaveCount(0);

    await field.fill(PASSWORD);
    await gate(page).getByRole("button", { name: "열기" }).click();
    await expect(body(page)).toContainText("소프트 줄바꿈 첫 줄", { timeout: 10_000 });
    await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible();
    const grant = await page.evaluate(() => Object.keys(window.sessionStorage).find((k) => k.startsWith("kurl:post-grant:")));
    expect(grant).toBeTruthy();
    expect(await page.evaluate(() => Object.keys(window.localStorage).some((k) => k.startsWith("kurl:post-grant:")))).toBe(false);
  });
});

test.describe("a country-limited post", () => {
  test("the server render carries no body and asks the browser to check", async ({ page }) => {
    const html = await (await page.request.get("/ko/p/hana/region-notes")).text();
    expect(html).toContain("어떤 나라에서는 열리지 않는 글");
    expect(html).not.toContain("나라에 따라 본문을 막은 글");
    expect(html).not.toContain("소프트 줄바꿈 첫 줄");
    expect(html).toContain('content="noindex, nofollow"');
  });

  test("a reader in a blocked country sees the notice and no way in", async ({ page }) => {
    await reader(page, { country: "KR" });
    await page.goto("/ko/p/hana/region-notes");
    await expect(gate(page)).toHaveAttribute("data-reason", "REGION", { timeout: 30_000 });
    await expect(gate(page)).toHaveText("이 나라에서는 볼 수 없는 글이에요");
    await expect(gate(page).locator("button, input")).toHaveCount(0);
    await expectNoReadingChrome(page);
  });

  test("a reader elsewhere gets the body from the browser's own read", async ({ page }) => {
    await reader(page, { country: "US" });
    await page.goto("/ko/p/hana/region-notes");
    await expect(body(page)).toContainText("나라에 따라 본문을 막은 글", { timeout: 30_000 });
    await expect(gate(page)).toHaveCount(0);
  });
});

test("a link-only post opens only with its key, and its share link keeps the key", async ({ page }) => {
  await reader(page);
  await page.goto("/ko/p/hana/link-only-draft");
  await expect(page.getByRole("heading", { level: 1, name: "링크로만 나누는 초안" })).toHaveCount(0);
  await page.goto("/ko/p/hana/link-only-draft?k=mock-unlisted-key");
  await expect(body(page)).toContainText("소프트 줄바꿈 첫 줄", { timeout: 30_000 });
  const html = await (await page.request.get("/ko/p/hana/link-only-draft?k=mock-unlisted-key")).text();
  expect(html).toContain('content="noindex, nofollow"');
  expect(html).toMatch(/og:url" content="[^"]*link-only-draft\?k=mock-unlisted-key"/);
});

test("the author's list shows locked posts by title with a mark, and the RSS leaves them out", async ({ page }) => {
  await reader(page);
  await page.goto("/ko/p/hana");
  const marks = page.locator("[data-audience-mark]");
  await expect(marks).toHaveCount(3, { timeout: 30_000 });
  await expect(page.getByRole("img", { name: "팔로워만" })).toBeVisible();
  await expect(page.getByRole("img", { name: "비밀번호" })).toBeVisible();
  await expect(page.getByRole("img", { name: "국가 제한" })).toBeVisible();
  await expect(page.getByText("링크로만 나누는 초안")).toHaveCount(0);

  const rss = await (await page.request.get("/ko/p/hana/feed")).text();
  expect(rss).toContain("모두에게 쓰는 편지");
  for (const hidden of ["팔로워에게만 쓰는 근황", "잠가 둔 일기", "어떤 나라에서는 열리지 않는 글", "링크로만 나누는 초안"]) {
    expect(rss).not.toContain(hidden);
  }
});
