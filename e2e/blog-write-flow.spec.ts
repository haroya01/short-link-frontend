import { test, expect, type Page } from "@playwright/test";

/**
 * Post editor write-flow — runs against a fully MOCKED backend (no Spring/DB/S3 needed), so it can
 * verify the whole authoring path in CI without infrastructure: load the editor, type a title and
 * body, insert an image through the upload pipeline, run the slash menu, and assert the exact block
 * payload that hits PUT /posts/:id/blocks. This is the "is a post saved correctly" guarantee that
 * unit tests on markdownToBlocks can't give (they don't drive the real Toast UI editor).
 *
 * Phone viewport so the formatting toolbar renders as the always-visible bottom bar (desktop uses a
 * selection-only bubble, which is awkward to drive headlessly).
 */
test.use({ viewport: { width: 390, height: 844 } });

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

// 1×1 transparent PNG.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const IMAGE_URL = "https://mock-s3.test/img.png";

type Captured = { blocks: Array<{ type: string; content: string | null }> | null };

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
    // Accept cookies up front — the fixed bottom banner otherwise overlaps the bottom toolbar.
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  }, TOKEN);
  await page.goto("/en/blog/write/16");
  // Toast UI mounts client-side after a dynamic import.
  await expect(page.locator(".ProseMirror.toastui-editor-contents")).toBeVisible({ timeout: 30_000 });
}

test("types a title + body, inserts an image, and saves the right blocks", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  // Title (first autocomplete-off text input on the page).
  const title = page.locator('input[type="text"][autocomplete="off"]').first();
  await title.fill("My e2e post");
  await expect(title).toHaveValue("My e2e post");

  // Body, then a fresh line so the image becomes its own block (an inline image stays in the
  // paragraph — markdownToBlocks only promotes a line that is *only* an image to an IMAGE block).
  await page.locator(".ProseMirror.toastui-editor-contents").click();
  await page.keyboard.type("Hello from the e2e write flow.");
  await page.keyboard.press("Enter");

  // Insert an image through the toolbar button → file chooser → mocked presign/PUT/commit.
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "image", exact: true }).click();
  await (await chooser).setFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_BASE64, "base64"),
  });
  await expect(page.locator(`.ProseMirror.toastui-editor-contents img[src="${IMAGE_URL}"]`)).toBeVisible({
    timeout: 15_000,
  });

  // Save → assert the serialized block payload.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();

  const blocks = captured.blocks!;
  const para = blocks.find((b) => b.type === "PARAGRAPH");
  const image = blocks.find((b) => b.type === "IMAGE");
  expect(para?.content).toContain("Hello from the e2e write flow.");
  expect(image, "an IMAGE block was saved").toBeTruthy();
  expect(image!.content).toContain(IMAGE_URL);
});

test.describe("desktop", () => {
  // Wider viewport so the formatting toolbar is the selection bubble, not the bottom bar.
  test.use({ viewport: { width: 1280, height: 800 } });

  test("selection bubble applies bold formatting", async ({ page }) => {
    const captured: Captured = { blocks: null };
    await setupMocks(page, captured);
    await openEditor(page);

    await page.locator(".ProseMirror.toastui-editor-contents").click();
    await page.keyboard.type("bold me");
    // Select the typed line back to its start — keeps the selection inside the contenteditable so
    // the bubble's in-editor selection check passes (a page-level select-all would not).
    await page.keyboard.press("Shift+Home");

    // The bubble appears only over a non-empty selection.
    const boldBtn = page.getByRole("button", { name: "bold", exact: true });
    await expect(boldBtn).toBeVisible({ timeout: 10_000 });
    await boldBtn.click();

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();

    const para = captured.blocks!.find((b) => b.type === "PARAGRAPH");
    expect(para?.content, "bold markdown was saved").toContain("**");
  });

  test("slash menu works on desktop too (no bottom bar present)", async ({ page }) => {
    const captured: Captured = { blocks: null };
    await setupMocks(page, captured);
    await openEditor(page);

    await page.locator(".ProseMirror.toastui-editor-contents").click();
    await page.keyboard.type("/h1");
    await page.getByRole("button", { name: "Heading 1" }).click();
    await page.keyboard.type("Desktop heading");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();
    const h1 = captured.blocks!.find((b) => b.type === "H1");
    expect(h1?.content).toContain("Desktop heading");
  });

  // Locks the "+" add-block affordance — it must keep opening the block menu on an empty line.
  test("the + affordance opens the block menu on an empty line", async ({ page }) => {
    const captured: Captured = { blocks: null };
    await setupMocks(page, captured);
    await openEditor(page);

    await page.locator(".ProseMirror.toastui-editor-contents").click();
    await page.keyboard.type("intro line");
    await page.keyboard.press("Enter");

    const plus = page.getByRole("button", { name: "Add a block" });
    await expect(plus).toBeVisible({ timeout: 10_000 });
    await plus.click();
    await page.getByRole("button", { name: "Heading 1" }).click();
    await page.keyboard.type("Added with plus");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();
    const h1 = captured.blocks!.find((b) => b.type === "H1");
    expect(h1?.content, "a block was inserted via the + menu").toContain("Added with plus");
    // The "+" must NOT leave a literal "/" behind (it opens the menu without typing one).
    expect(h1!.content).not.toContain("/");
    expect(captured.blocks!.some((b) => b.content?.trim() === "/")).toBe(false);
  });
});

test("slash menu inserts a heading block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".ProseMirror.toastui-editor-contents").click();
  await page.keyboard.type("/h1");
  // The menu reads the typed "/h1" and filters to Heading 1.
  await page.getByRole("button", { name: "Heading 1" }).click();
  await page.keyboard.type("A big heading");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();

  const h1 = captured.blocks!.find((b) => b.type === "H1");
  expect(h1, "an H1 block was saved").toBeTruthy();
  expect(h1!.content).toContain("A big heading");
});

test("slash menu code block survives a blank line on save", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".ProseMirror.toastui-editor-contents").click();
  await page.keyboard.type("/code");
  await page.getByRole("button", { name: "Code block" }).click();
  // A blank line inside the code used to split the block into pieces on save.
  await page.keyboard.type("const a = 1;");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("const b = 2;");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();

  // The whole fenced block stays a single CODE block carrying both lines across the blank line.
  const codeBlock = captured.blocks!.find((b) => b.type === "CODE");
  expect(codeBlock, "a CODE block was saved").toBeTruthy();
  const code = JSON.parse(codeBlock!.content!).code as string;
  expect(code).toContain("const a = 1;");
  expect(code).toContain("const b = 2;");
});

test("slash menu inserts a table", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".ProseMirror.toastui-editor-contents").click();
  await page.keyboard.type("/table");
  await page.getByRole("button", { name: "Table" }).click();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();

  // Saved as a TABLE block holding GFM markdown (pipes + the header separator row).
  const table = captured.blocks!.find((b) => b.type === "TABLE");
  expect(table, "a TABLE block was saved").toBeTruthy();
  expect(table!.content).toContain("|");
  expect(table!.content).toContain("---");
});

test("slash menu inserts a wide image (width survives the save round-trip)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".ProseMirror.toastui-editor-contents").click();
  await page.keyboard.type("/wide");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Wide image" }).click();
  await (await chooser).setFiles({
    name: "hero.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_BASE64, "base64"),
  });
  await expect(page.locator(`.ProseMirror.toastui-editor-contents img[src="${IMAGE_URL}"]`)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();
  const img = captured.blocks!.find((b) => b.type === "IMAGE");
  expect(img, "a wide IMAGE block was saved").toBeTruthy();
  expect(JSON.parse(img!.content!).width, "width survived Toast's markdown round-trip").toBe("wide");
});
