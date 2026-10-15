import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("an excerpt-only import shows the summary, then the measured link to the original", async ({ page }) => {
  await page.goto("/ko/p/minji/killed-side-project");
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    "https://blog.naver.com/minji_maker/223456789012",
  );
  const card = page.getByTestId("post-source-card");
  await expect(card).toHaveAttribute("href", "https://kurl.me/mjK7q", { timeout: 30_000 });
  await expect(card).toContainText("네이버 블로그");
  await expect(card).toContainText("원문에서 읽기 →");
  await expect(card).toContainText("blog.naver.com/minji_maker/223456789012");
  await expect(page.locator(".prose-post p")).toHaveCount(1);
  await expect(page.getByTestId("post-source-line")).toHaveCount(0);
});

test("a full import names its original at the head and leaves the body whole", async ({ page }) => {
  await page.goto("/ko/p/dohyun/naming-things");
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", "https://dohyun-dev.tistory.com/42");
  const line = page.getByTestId("post-source-line");
  await expect(line).toHaveText("원문: 티스토리", { timeout: 30_000 });
  await expect(line.getByRole("link", { name: "티스토리" })).toHaveAttribute("href", "https://dohyun-dev.tistory.com/42");
  await expect(page.getByTestId("post-source-card")).toHaveCount(0);
});

test("a post written on kurl keeps its own canonical and no source marks", async ({ page }) => {
  await page.goto("/ko/p/dohyun/nextjs-14-app-router-blog");
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", /\/nextjs-14-app-router-blog$/);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("post-source-line")).toHaveCount(0);
  await expect(page.getByTestId("post-source-card")).toHaveCount(0);
});

test("feed rows carry the platform of an imported post in the byline", async ({ page }) => {
  await page.goto("/ko/blog");
  const imported = page.locator("[data-feed-row]").filter({ hasText: "사이드 프로젝트를 6개월 만에 접은 이야기" });
  await expect(imported.getByTestId("feed-card-source")).toHaveText("네이버 블로그", { timeout: 30_000 });
  const full = page.locator("[data-feed-row]").filter({ hasText: "리팩터링: 이름 짓기에 하루를 쓰는 이유" });
  await expect(full.getByTestId("feed-card-source")).toHaveText("티스토리");
  const own = page.locator("[data-feed-row]").filter({ hasText: "Next.js 14 App Router로 블로그를 다시 만든 이유" });
  await expect(own.getByTestId("feed-card-source")).toHaveCount(0);
});

test("reader notices read as facts about the post and open its analytics", async ({ page }) => {
  await page.goto("/ko/blog/notifications");
  const main = page.locator("main");
  const first = main.getByRole("link", { name: /^내 글을 처음 읽은 사람이 생겼어요, Spring Boot 트랜잭션 전파, 다시 정리$/ });
  await expect(first).toHaveAttribute("href", /\/analytics\/6$/, { timeout: 30_000 });
  const milestone = main.getByRole("link", { name: /내 글을 100명이 읽었어요, 타입스크립트 제네릭이 어려운 이유$/ });
  await expect(milestone).toHaveAttribute("href", /\/analytics\/5$/);
  await expect(main.getByTestId("notification-reader-glyph")).toHaveCount(2);
});

test("settings let a writer turn reader notices off", async ({ page }) => {
  await page.goto("/ko/blog/settings");
  const posts = page.locator("div").filter({ has: page.getByRole("heading", { name: "내 글", exact: true }) }).last();
  await expect(posts.getByRole("switch", { name: "첫 독자", exact: true })).toHaveAttribute("aria-checked", "true", {
    timeout: 30_000,
  });
  await expect(posts.getByRole("switch", { name: "읽은 사람 수", exact: true })).toHaveAttribute("aria-checked", "true");
});
