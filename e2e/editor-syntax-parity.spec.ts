import { test, expect, type Page } from "@playwright/test";

// Mock-only lane (Playwright routes): what the blog editor stores when a writer types the markdown the
// app's editor understands. Each test types like a person (a beat after each Enter) and reads the blocks
// that reach PUT /posts/:id/blocks.
test.use({ viewport: { width: 1280, height: 900 } });

const POST_ID = 16;
const NOW = "2026-05-29T00:00:00Z";
const POST = {
  id: POST_ID,
  slug: "my-draft",
  title: "문법",
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

type Block = { type: string; content: string | null };

async function openEditor(page: Page) {
  const saved: { blocks: Block[] | null } = { blocks: null };
  await page.route("**/api/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: ME }));
  await page.route(`**/api/v1/posts/${POST_ID}`, (route) => route.fulfill({ json: POST }));
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) => {
    if (route.request().method() === "PUT") saved.blocks = route.request().postDataJSON()?.blocks ?? null;
    return route.fulfill({ json: [] });
  });
  await page.context().addInitScript(() => {
    window.localStorage.setItem("short-link:access-token", "e2e-fake-token");
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  });
  await page.goto(`/ko/blog/write/${POST_ID}`);
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
  await page.locator(".tiptap").click();
  return saved;
}

async function write(page: Page, ...parts: string[]) {
  for (const part of parts) {
    if (part === "\n") {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
    } else {
      await page.keyboard.type(part, { delay: 10 });
    }
  }
}

async function blocks(saved: { blocks: Block[] | null }, done: (b: Block[]) => boolean): Promise<Block[]> {
  await expect.poll(() => (saved.blocks ? done(saved.blocks) : false), { timeout: 20_000 }).toBe(true);
  return saved.blocks!;
}

test("```js and Enter opens a code block in that language", async ({ page }) => {
  const saved = await openEditor(page);
  await write(page, "```js", "\n", "const a = 1");
  const [code] = await blocks(saved, (b) => b.some((x) => x.type === "CODE" && x.content?.includes("const a")));
  expect(code.type).toBe("CODE");
  expect(JSON.parse(code.content!)).toEqual({ lang: "js", code: "const a = 1" });
});

test("``` alone and Enter opens a plain code block", async ({ page }) => {
  const saved = await openEditor(page);
  await write(page, "```", "\n", "x = 1");
  const code = (await blocks(saved, (b) => b.some((x) => x.type === "CODE"))).find((x) => x.type === "CODE")!;
  expect(JSON.parse(code.content!)).toEqual({ lang: null, code: "x = 1" });
});

test("a quote whose first line is [!TIP] saves as that callout even before Enter", async ({ page }) => {
  const saved = await openEditor(page);
  await write(page, "> ", "[!TIP]");
  const quote = (await blocks(saved, (b) => b.some((x) => x.type === "QUOTE"))).find((x) => x.type === "QUOTE")!;
  expect(quote.content).toBe("[!TIP]");
});

test("a quote whose first line is [!NOTE] becomes that callout", async ({ page }) => {
  const saved = await openEditor(page);
  await write(page, "> ", "[!NOTE]", "\n", "알아 둘 것");
  const quote = (await blocks(saved, (b) => b.some((x) => x.type === "QUOTE" && !!x.content?.includes("알아 둘 것")))).find(
    (x) => x.type === "QUOTE",
  )!;
  expect(quote.content).toBe("[!NOTE]\n알아 둘 것");
  await expect(page.locator(".tiptap blockquote[data-alert='note']")).toHaveText("알아 둘 것");
});

test(":::note warn … ::: typed line by line becomes a warning callout", async ({ page }) => {
  const saved = await openEditor(page);
  await write(page, ":::note warn", "\n", "조심할 것", "\n", ":::");
  const quote = (await blocks(saved, (b) => b.some((x) => x.type === "QUOTE"))).find((x) => x.type === "QUOTE")!;
  expect(quote.content).toBe("[!WARNING]\n조심할 것");
  await expect(page.locator(".tiptap blockquote[data-alert='warning']")).toHaveText("조심할 것");
});

test("[text](url) and <url> typed in a sentence become links", async ({ page }) => {
  const saved = await openEditor(page);
  await write(page, "읽어 볼 [소개](https://kurl.me/about) 와 <https://kurl.me> 끝");
  const paragraph = (await blocks(saved, (b) => b.some((x) => x.content?.includes("끝")))).find((x) => x.type === "PARAGRAPH")!;
  expect(paragraph.content).toBe("읽어 볼 [소개](https://kurl.me/about) 와 <https://kurl.me> 끝");
  await expect(page.locator(".tiptap a[href='https://kurl.me/about']")).toHaveText("소개");
});

test("a typed ![alt](url) keeps the image and the next words land after it", async ({ page }) => {
  const saved = await openEditor(page);
  await write(page, "![바다](https://mock-s3.test/sea.png)", " 다음 줄");
  const saved2 = await blocks(saved, (b) => b.some((x) => x.content?.includes("다음 줄")));
  expect(saved2.map((x) => x.type)).toEqual(["IMAGE", "PARAGRAPH"]);
  expect(saved2[0].content).toContain("https://mock-s3.test/sea.png");
});

test("a pasted footnote stays as written instead of turning into a link", async ({ page }) => {
  const saved = await openEditor(page);
  await page.locator(".tiptap").evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "각주가 있는 문장[^1]\n\n[^1]: 설명");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  const saved2 = await blocks(saved, (b) => b.some((x) => x.content?.includes("설명")));
  expect(saved2.map((x) => x.content?.replace(/\\/g, ""))).toEqual(["각주가 있는 문장[^1]", "[^1]: 설명"]);
  await expect(page.locator(".tiptap a")).toHaveCount(0);
});
