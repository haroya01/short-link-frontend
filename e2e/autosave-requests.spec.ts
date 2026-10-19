import { test, expect, type Page } from "@playwright/test";

// Mock-only lane: the authoring backend is Playwright routes. A scripted minute of writing on a draft
// (a sentence, a short pause, now and then a longer one) runs on a fake clock, and the spec counts the
// saves that reach the server. Production showed about 11 PATCH /posts/{id} and 11 PUT /posts/{id}/blocks
// per minute for one writer.
test.use({ viewport: { width: 1280, height: 900 } });

const POST_ID = 16;
const NOW = "2026-05-29T00:00:00Z";
const POST = {
  id: POST_ID,
  slug: "my-draft",
  title: "",
  status: "DRAFT",
  languageTag: "ko",
  publishedAt: null,
  scheduledAt: null,
  excerpt: null,
  ogImageUrl: null,
  viewCount: 0,
  tags: [],
  seriesId: null,
  seriesOrder: null,
  createdAt: NOW,
  updatedAt: NOW,
};
const ME = { id: 1, email: "e2e@kurl.test", role: "USER", createdAt: NOW, username: "e2euser" };

type Saves = { patch: number; put: number; lastBody: string };

async function openDraft(page: Page): Promise<Saves> {
  const saves: Saves = { patch: 0, put: 0, lastBody: "" };
  await page.route("**/api/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: ME }));
  await page.route(`**/api/v1/posts/${POST_ID}`, (route) => {
    if (route.request().method() === "PATCH") saves.patch += 1;
    return route.fulfill({ json: POST });
  });
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) => {
    if (route.request().method() === "PUT") {
      saves.put += 1;
      const blocks = (route.request().postDataJSON()?.blocks ?? []) as { content: string | null }[];
      saves.lastBody = blocks.map((b) => b.content ?? "").join("\n");
    }
    return route.fulfill({ json: [] });
  });
  await page.context().addInitScript(() => {
    window.localStorage.setItem("short-link:access-token", "e2e-fake-token");
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  });
  await page.clock.install();
  await page.goto(`/ko/blog/write/${POST_ID}`);
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
  await page.clock.pauseAt(Date.now() + 1000);
  return saves;
}

async function writeAMinute(page: Page) {
  await page.locator('textarea[autocomplete="off"]').first().fill("한 편의 글");
  await page.locator(".tiptap").click();
  for (let i = 1; i <= 16; i++) {
    await page.keyboard.type(`문장 ${i}을 쓴다. `);
    await page.clock.runFor(i % 8 === 0 ? 6000 : 2500);
  }
}

test("a minute of writing saves on pauses and at most every twenty seconds, sending only what changed", async ({ page }) => {
  const saves = await openDraft(page);
  await writeAMinute(page);
  const during = { ...saves };
  await page.clock.runFor(5000);
  await expect.poll(() => saves.lastBody).toContain("문장 16을 쓴다.");

  test.info().annotations.push({ type: "saves in the minute", description: `PATCH ${during.patch}, PUT ${during.put}` });
  expect(during.put).toBeLessThanOrEqual(5);
  expect(during.patch).toBeLessThanOrEqual(2);
});

test("leaving the tab saves the last words at once", async ({ page }) => {
  const saves = await openDraft(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("탭을 떠나기 직전의 문장");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(300);
  await expect.poll(() => saves.lastBody).toContain("탭을 떠나기 직전의 문장");
});
