import { test, expect, type Page } from "@playwright/test";

/**
 * Post editor write-flow — runs against a fully MOCKED backend (no Spring/DB/S3 needed), so it can
 * verify the whole authoring path in CI without infrastructure: load the editor, type a title and
 * body, run markdown shortcuts, drive the slash menu + the "+" block handle, and insert a live link
 * card, then assert the exact block payload that hits PUT /posts/:id/blocks. This is the "is a post
 * saved correctly" guarantee that unit tests on markdownToBlocks can't give — they don't drive the
 * real Tiptap editor, its node views, or its serialization.
 *
 * Desktop viewport: the Tiptap editor has no phone bottom bar — formatting is a selection bubble, and
 * the "+ / ⋮⋮" block gutter appears on hover, which needs a real pointer (a touch viewport never
 * fires the hover that reveals it).
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
  publishedAt: null,
  scheduledAt: null,
  excerpt: null,
  ogImageUrl: null,
  viewCount: 0,
  tags: [] as string[],
  seriesId: null,
  seriesOrder: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const ME = { id: 1, email: "e2e@kurl.test", role: "USER", createdAt: NOW, username: "e2euser" };

const IMAGE_URL = "https://mock-s3.test/img.png";

type Block = { type: string; content: string | null };
type Captured = { blocks: Block[] | null };

async function setupMocks(page: Page, captured: Captured) {
  // Generic fallback FIRST so specific routes (registered after) take priority.
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
  // Live link-card preview (the editor node view fetches this) — return a believable rich preview.
  await page.route("**/api/v1/public/link-preview**", (route) =>
    route.fulfill({
      json: {
        url: "https://example.com",
        title: "Example — link preview",
        description: "Open Graph description goes here.",
        image: "https://mock-s3.test/og.png",
      },
    }),
  );
  await page.route(`**/api/v1/posts/${POST_ID}/images/presign`, (route) =>
    route.fulfill({
      json: {
        uploadUrl: "https://mock-s3.test/upload",
        publicUrl: IMAGE_URL,
        key: "k",
        contentType: "image/png",
        maxBytes: 10 * 1024 * 1024,
        expiresIn: 600,
      },
    }),
  );
  await page.route(`**/api/v1/posts/${POST_ID}/images/commit`, (route) =>
    route.fulfill({ json: { imageUrl: IMAGE_URL, key: "k" } }),
  );
  await page.route("https://mock-s3.test/**", (route) => route.fulfill({ status: 200, body: "" }));
}

async function openEditor(page: Page) {
  await page.context().addInitScript((t) => {
    window.localStorage.setItem("short-link:access-token", t as string);
    // Accept cookies up front — the fixed bottom banner otherwise overlaps the editor.
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  }, TOKEN);
  await page.goto("/en/blog/write/16");
  // The Tiptap editor mounts client-side after a dynamic import.
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
}

/** Title field (the only autocomplete-off text input — the URL dialog uses type=url). */
function titleInput(page: Page) {
  return page.locator('input[type="text"][autocomplete="off"]').first();
}

async function save(page: Page, captured: Captured): Promise<Block[]> {
  // Clicking Save blurs the editor → the onBlur flush serializes the latest markdown (the keystroke
  // path is debounced, so a blur-flush is what makes Save deterministic).
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();
  return captured.blocks!;
}

test("types a title + body and saves a PARAGRAPH block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await titleInput(page).fill("My e2e post");
  await expect(titleInput(page)).toHaveValue("My e2e post");

  await page.locator(".tiptap").click();
  await page.keyboard.type("Hello from the e2e write flow.");

  const blocks = await save(page, captured);
  const para = blocks.find((b) => b.type === "PARAGRAPH");
  expect(para?.content).toContain("Hello from the e2e write flow.");
});

test("markdown shortcut '## ' becomes an H2 block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  // StarterKit input rule: "##" + space → heading level 2.
  await page.keyboard.type("## Section title");

  const blocks = await save(page, captured);
  const h2 = blocks.find((b) => b.type === "H2");
  expect(h2, "an H2 block was saved").toBeTruthy();
  expect(h2!.content).toContain("Section title");
});

test("slash menu inserts a heading", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  // Menu items are role=option; their accessible name is "<label> <description>", so match the
  // label at the start. Choosing one deletes the "/query" run, so no stray "/" survives.
  await page.getByRole("option", { name: /^Heading 1\b/ }).click();
  await page.keyboard.type("A big heading");

  const blocks = await save(page, captured);
  const h1 = blocks.find((b) => b.type === "H1");
  expect(h1, "an H1 block was saved").toBeTruthy();
  expect(h1!.content).toContain("A big heading");
  expect(blocks.some((b) => b.content?.trim() === "/")).toBe(false);
});

test("slash menu inserts a table (GFM round-trips through save)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Table\b/ }).click();

  const blocks = await save(page, captured);
  const table = blocks.find((b) => b.type === "TABLE");
  expect(table, "a TABLE block was saved").toBeTruthy();
  expect(table!.content).toContain("|");
  expect(table!.content).toContain("---");
});

test("slash menu inserts a code block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Code block\b/ }).click();

  // The editing surface IS CodeMirror (its own NodeView). Asserting the block exists is the reliable
  // guarantee here — driving CodeMirror's text + its async sync back to ProseMirror headlessly is
  // timing-sensitive, so the text round-trip is left to the markdown unit tests.
  await expect(page.locator(".tiptap .cm-content")).toBeVisible({ timeout: 10_000 });
});

test("the '+' block handle adds a clean empty block below — NO stray '/'", async ({ page }) => {
  // Regression lock for the reported bug: pressing the gutter "+" used to drop a literal "/" into the
  // wrong (next) block. It must now insert an empty paragraph below the hovered block, caret inside.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("first line");
  await page.keyboard.press("Enter");
  await page.keyboard.type("second line");

  // Reveal the gutter on the FIRST paragraph, then fire the "+" without moving the pointer off the
  // content: a real pointer move onto the gutter button makes the drag-handle hide before the click
  // lands. dispatchEvent fires onClick in place — and exercises the handler's no-op-safety fallback.
  const firstPara = page.locator(".tiptap p", { hasText: "first line" }).first();
  await firstPara.hover();
  const plus = page.getByRole("button", { name: "Add block below" });
  await expect(plus).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(150);
  await plus.dispatchEvent("click");
  // The "+" adds exactly one empty paragraph. Find it (position-agnostic) and type into it — clicking
  // the gutter button itself left DOM focus on the button, so click the new block first.
  const paras = page.locator(".tiptap > p");
  await expect(paras).toHaveCount(3);
  let emptyIdx = -1;
  for (let i = 0; i < (await paras.count()); i++) {
    if (((await paras.nth(i).textContent()) ?? "").trim() === "") {
      emptyIdx = i;
      break;
    }
  }
  expect(emptyIdx, "the '+' added a new empty paragraph").toBeGreaterThanOrEqual(0);
  await paras.nth(emptyIdx).click();
  await page.keyboard.type("inserted line");

  const blocks = await save(page, captured);
  const text = blocks.map((b) => b.content ?? "").join("\n");
  expect(text).toContain("first line");
  expect(text).toContain("inserted line");
  expect(text).toContain("second line");
  // The headline guarantee: the "+" left no literal "/" anywhere.
  expect(blocks.some((b) => b.content?.trim() === "/")).toBe(false);
  expect(
    blocks.some((b) => (b.content ?? "").includes("/inserted") || (b.content ?? "").includes("inserted/")),
  ).toBe(false);
});

test("the embed dialog inserts a live link card that round-trips to an EMBED block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Embed\b/ }).click();

  // The in-app URL dialog replaces window.prompt; type a YouTube link and confirm with Enter.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.locator('input[type="url"]').fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await dialog.locator('input[type="url"]').press("Enter");

  // The live card node view renders in the editor.
  await expect(page.locator(".tiptap [data-link-card]")).toBeVisible({ timeout: 10_000 });

  const blocks = await save(page, captured);
  // A bare video URL on its own line serializes to an EMBED block (markdownToBlocks re-detects it).
  const embed = blocks.find((b) => b.type === "EMBED");
  expect(embed, "an EMBED block was saved").toBeTruthy();
  expect(embed!.content).toContain("dQw4w9WgXcQ");
});

test("the floating insert bar shows on an empty line and inserts a block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  // Focusing the empty editor reveals the floating block palette (no "/" knowledge required).
  await page.locator(".tiptap").click();
  const headingBtn = page.getByRole("button", { name: "Heading 2", exact: true });
  await expect(headingBtn).toBeVisible({ timeout: 10_000 });
  await headingBtn.click();
  await page.keyboard.type("From the floating bar");

  // It must hide once the line has content (no longer an empty paragraph).
  await expect(headingBtn).toBeHidden();

  const blocks = await save(page, captured);
  const h2 = blocks.find((b) => b.type === "H2");
  expect(h2, "the floating bar inserted an H2").toBeTruthy();
  expect(h2!.content).toContain("From the floating bar");
});
