import { test, expect, type Page } from "@playwright/test";

/**
 * Integrated write-flow stress — unlike blog-write-flow.spec.ts (one feature per test), each test
 * here drives MANY features in a single editing session and asserts the wire truth (the exact
 * blocks payload that hits PUT /posts/:id/blocks): markdown shortcuts + slash menu + table + quote
 * in one document, and a tens-of-thousands-of-characters markdown paste that must land as blocks
 * while the editor stays responsive. Fully mocked backend via Playwright routes (no infra), same
 * scaffolding as blog-write-flow.spec.ts.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const TOKEN = "e2e-fake-token";
const POST_ID = 16;
const NOW = "2026-05-29T00:00:00Z";

const POST = {
  id: POST_ID,
  slug: "my-draft",
  title: "",
  status: "DRAFT",
  languageTag: "ko",
  publishedAt: null as string | null,
  scheduledAt: null as string | null,
  excerpt: null as string | null,
  ogImageUrl: null as string | null,
  viewCount: 0,
  tags: [] as string[],
  seriesId: null as number | null,
  seriesOrder: null as number | null,
  createdAt: NOW,
  updatedAt: NOW,
};

const ME = { id: 1, email: "e2e@kurl.test", role: "USER", createdAt: NOW, username: "e2euser" };

type Block = { type: string; content: string | null };
type Captured = { blocks: Block[] | null };

async function setupMocks(page: Page, captured: Captured) {
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: ME }));
  await page.route(`**/api/v1/posts/${POST_ID}`, (route) => route.fulfill({ json: POST }));
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) => {
    if (route.request().method() === "PUT") {
      captured.blocks = route.request().postDataJSON()?.blocks ?? null;
    }
    return route.fulfill({ json: [] });
  });
}

async function openEditor(page: Page) {
  await page.context().addInitScript((t) => {
    window.localStorage.setItem("short-link:access-token", t as string);
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  }, TOKEN);
  await page.goto(`/en/blog/write/${POST_ID}`);
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
}

function titleInput(page: Page) {
  return page.locator('input[type="text"][autocomplete="off"]').first();
}

/** Wait until an autosave flush contains the given block type — long sessions legitimately flush
 *  mid-way, so "first payload" is a partial snapshot; we wait for the one holding the LAST piece. */
async function saveUntil(captured: Captured, type: string): Promise<Block[]> {
  await expect
    .poll(() => captured.blocks?.some((b) => b.type === type) ?? false, { timeout: 25_000 })
    .toBe(true);
  return captured.blocks!;
}

/** Wait for any autosave flush (short sessions where the last action is also the first flush). */
async function save(captured: Captured): Promise<Block[]> {
  await expect.poll(() => captured.blocks, { timeout: 20_000 }).not.toBeNull();
  return captured.blocks!;
}

test("one session mixes shortcuts, slash menu, table and quote — the wire payload holds all of it", async ({
  page,
}) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await titleInput(page).fill("Integrated stress");

  const editor = page.locator(".tiptap");
  await editor.click();

  // Structural keys (Enter after input rules) race ProseMirror transactions at machine speed —
  // pace like a human: per-key delay + a beat after each structural Enter (same lesson as the
  // iOS editor's synchronous-shortcut fix; here we only slow the test, the editor is fine live).
  const type = (text: string) => page.keyboard.type(text, { delay: 15 });
  const enter = async () => {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(150);
  };

  // 1) heading shortcut → body text (헤딩의 Enter 는 네이티브 분할)
  await type("# Big heading");
  await enter();
  // 노션식 Enter 설계: 평문단 안 첫 Enter = 소프트 브레이크, 두 번째 = 진짜 문단 분할.
  await type("Intro paragraph with body text.");
  await enter();
  await enter();

  // 2) bullet list shortcut, two items, then break out
  await type("- first item");
  await enter();
  await type("second item");
  await enter();
  await enter(); // empty item exits the list

  // 3) quote shortcut
  await type("> a quiet quote");
  await enter();
  await enter();

  // 4) slash menu → table
  await type("/");
  await page.getByRole("option", { name: /^Table\b/ }).click();

  const blocks = await saveUntil(captured, "TABLE");
  const types = blocks.map((b) => b.type);

  // Everything from the one session landed, in document order.
  expect(types).toContain("H1");
  expect(types).toContain("PARAGRAPH");
  expect(types).toContain("LIST_BULLET");
  expect(types).toContain("QUOTE");
  expect(types).toContain("TABLE");
  expect(types.indexOf("H1")).toBeLessThan(types.indexOf("LIST_BULLET"));
  expect(types.indexOf("LIST_BULLET")).toBeLessThan(types.indexOf("QUOTE"));
  expect(types.indexOf("QUOTE")).toBeLessThan(types.indexOf("TABLE"));

  expect(blocks.find((b) => b.type === "H1")?.content).toContain("Big heading");
  const list = blocks.find((b) => b.type === "LIST_BULLET");
  expect(list?.content).toContain("first item");
  expect(list?.content).toContain("second item");
  // 리스트는 네이티브 Enter(항목 분할) — 소프트 브레이크(\)가 항목 안에 새면 설계 위반.
  expect(list?.content).not.toContain("\\");
  expect(blocks.find((b) => b.type === "QUOTE")?.content).toContain("a quiet quote");
  expect(blocks.find((b) => b.type === "TABLE")?.content).toContain("---");
});

test("a tens-of-thousands-of-characters markdown paste lands as blocks and the editor stays responsive", async ({
  page,
}) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await titleInput(page).fill("Huge paste");

  // ~30k chars of mixed markdown — the same fixture family the backend/iOS stress suites pin.
  const parts: string[] = [];
  for (let i = 1; i <= 120; i++) {
    if (i % 4 === 0) parts.push(`## Section ${i}`);
    else if (i % 4 === 1) parts.push(`${"lorem kurl stress body text ".repeat(40)}(${i})`);
    else if (i % 4 === 2) parts.push(`- item ${i}\n- item ${i}-b`);
    else parts.push(`> quote line ${i}`);
  }
  const huge = parts.join("\n\n");
  expect(huge.length).toBeGreaterThan(20_000);

  const editor = page.locator(".tiptap");
  await editor.click();
  // Dispatch a real paste event with text/plain — ProseMirror's paste pipeline (and the markdown
  // paste rule) handles it exactly like a user paste, without needing OS clipboard access.
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    document
      .querySelector(".tiptap")
      ?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, huge);

  const blocks = await saveUntil(captured, "H2");
  expect(blocks.length).toBeGreaterThan(100);
  const types = new Set(blocks.map((b) => b.type));
  expect(types.has("H2")).toBe(true);
  expect(types.has("LIST_BULLET")).toBe(true);
  expect(types.has("QUOTE")).toBe(true);

  // The editor is still alive after the giant paste — typing keeps working and re-saves.
  captured.blocks = null;
  await editor.click();
  await page.keyboard.press("ControlOrMeta+End").catch(() => {});
  await page.keyboard.type(" tail after huge paste");
  const after = await save(captured);
  expect(JSON.stringify(after)).toContain("tail after huge paste");
});
