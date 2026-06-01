import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1280, height: 800 } });

const TOKEN = "e2e-fake-token";
const POST_ID = 16;
const NOW = "2026-05-29T00:00:00Z";
const EDITOR = ".ProseMirror.tiptap";
const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

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

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const SVG_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23d8dee9'/%3E%3C/svg%3E";

type Block = { type: string; content: string | null };
type Captured = { blocks: Block[] | null };
type Box = { x: number; y: number; width: number; height: number; display: string; alt?: string };

function watchDiagnostics(page: Page) {
  const consoleMessages: string[] = [];
  const requestFailures: string[] = [];
  const uploadEvents: string[] = [];

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => consoleMessages.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) => {
    const line = `${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? "unknown"}`;
    requestFailures.push(line);
    if (req.url().includes("/images/")) uploadEvents.push(`failed ${line}`);
  });
  page.on("response", (res) => {
    if (res.url().includes("/images/")) uploadEvents.push(`response ${res.status()} ${res.url()}`);
  });

  return { consoleMessages, requestFailures, uploadEvents };
}

async function setupCoreMocks(page: Page, captured: Captured) {
  await page.route(`**/api/v1/posts/${POST_ID}`, async (route) => {
    const method = route.request().method();
    if (method === "GET") return route.fulfill({ json: POST });
    if (method === "PATCH") {
      const body = route.request().postDataJSON() as Partial<typeof POST>;
      return route.fulfill({ json: { ...POST, ...body, updatedAt: NOW } });
    }
    return route.fulfill({ status: 204, body: "" });
  });
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, async (route) => {
    if (route.request().method() === "PUT") {
      captured.blocks = route.request().postDataJSON()?.blocks ?? null;
      return route.fulfill({
        json: (captured.blocks ?? []).map((block, i) => ({ id: i + 1, blockOrder: i, ...block })),
      });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/api/v1/series", (route) => route.fulfill({ json: [] }));
}

async function openEditor(page: Page) {
  await page.context().addInitScript((token) => {
    window.localStorage.setItem("short-link:access-token", token as string);
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  }, TOKEN);
  await page.goto(`/en/blog/write/${POST_ID}`);
  await expect(page.locator(EDITOR)).toBeVisible({ timeout: 30_000 });
}

async function getMarkdown(page: Page): Promise<string> {
  return page.evaluate((selector) => {
    const editor = (document.querySelector(selector) as { editor?: { storage?: { markdown?: { getMarkdown?: () => string } } } } | null)?.editor;
    return editor?.storage?.markdown?.getMarkdown?.() ?? "";
  }, EDITOR);
}

async function setEditorContent(page: Page, content: unknown): Promise<string> {
  return page.evaluate(
    ({ selector, content }) => {
      const editor = (document.querySelector(selector) as { editor?: { commands?: { setContent: (value: unknown) => boolean }, storage?: { markdown?: { getMarkdown?: () => string } } } } | null)?.editor;
      if (!editor) throw new Error("Tiptap editor instance was not reachable from the ProseMirror DOM");
      editor.commands?.setContent(content);
      return editor.storage?.markdown?.getMarkdown?.() ?? "";
    },
    { selector: EDITOR, content },
  );
}

async function editorImageBoxes(page: Page): Promise<{ rootWidth: number; boxes: Box[] }> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) throw new Error("editor missing");
    const rootRect = root.getBoundingClientRect();
    const boxes = Array.from(root.querySelectorAll("img")).map((img) => {
      const rect = img.getBoundingClientRect();
      const style = window.getComputedStyle(img);
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        display: style.display,
        alt: img.getAttribute("alt") ?? "",
      };
    });
    return { rootWidth: rootRect.width, boxes };
  }, EDITOR);
}

async function installReaderFixture(page: Page): Promise<Box[]> {
  return page.evaluate((src) => {
    let host = document.getElementById("__half_reader_fixture");
    if (!host) {
      host = document.createElement("div");
      host.id = "__half_reader_fixture";
      host.style.cssText = "position:absolute;left:0;top:0;width:min(42rem,100vw);visibility:hidden;";
      document.body.appendChild(host);
    }
    host.innerHTML =
      `<div class="prose-post"><figure class="post-img-half"><img src="${src}" alt="left"></figure><figure class="post-img-half"><img src="${src}" alt="right"></figure></div>`;
    return Array.from(host.querySelectorAll("figure")).map((fig) => {
      const rect = fig.getBoundingClientRect();
      const style = window.getComputedStyle(fig);
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        display: style.display,
      };
    });
  }, SVG_SRC);
}

function assertSideBySide(label: string, rootWidth: number, boxes: Box[]) {
  expect(boxes, `${label}: two rendered items`).toHaveLength(2);
  expect(boxes[0].display, `${label}: first display`).toBe("inline-block");
  expect(boxes[1].display, `${label}: second display`).toBe("inline-block");
  expect(boxes[0].width / rootWidth, `${label}: first width ratio`).toBeGreaterThan(0.45);
  expect(boxes[0].width / rootWidth, `${label}: first width ratio`).toBeLessThan(0.52);
  expect(boxes[1].width / rootWidth, `${label}: second width ratio`).toBeGreaterThan(0.45);
  expect(boxes[1].width / rootWidth, `${label}: second width ratio`).toBeLessThan(0.52);
  expect(boxes[1].x, `${label}: second item is to the right`).toBeGreaterThan(boxes[0].x + boxes[0].width - 2);
  expect(Math.abs(boxes[0].y - boxes[1].y), `${label}: similar top offset`).toBeLessThan(24);
}

function assertStacked(label: string, rootWidth: number, boxes: Box[]) {
  expect(boxes, `${label}: two rendered items`).toHaveLength(2);
  expect(boxes[0].display, `${label}: first display`).toBe("block");
  expect(boxes[1].display, `${label}: second display`).toBe("block");
  expect(boxes[0].width / rootWidth, `${label}: first full-width ratio`).toBeGreaterThan(0.95);
  expect(boxes[1].width / rootWidth, `${label}: second full-width ratio`).toBeGreaterThan(0.95);
  expect(boxes[1].y, `${label}: second item stacks below first`).toBeGreaterThan(boxes[0].y + boxes[0].height - 1);
}

test("dynamic Tiptap blog editor verification", async ({ page }) => {
  const captured: Captured = { blocks: null };
  const diagnostics = watchDiagnostics(page);
  await setupCoreMocks(page, captured);
  await openEditor(page);

  await page.locator(EDITOR).click();
  await page.keyboard.type("/");
  const menu = page.getByRole("listbox");
  await expect(menu).toBeVisible();
  const slashLabels = (await menu.getByRole("option").allTextContents()).map((s) => s.trim());
  await expect(menu.getByRole("option", { name: "Image", exact: true })).toBeVisible();
  await expect(menu.getByRole("option", { name: "Wide image", exact: true })).toBeVisible();
  await expect(menu.getByRole("option", { name: "Two images (side by side)", exact: true })).toBeVisible();
  console.log(`[1a] slash items: ${JSON.stringify(slashLabels)}`);
  await page.keyboard.press("Escape");

  await setEditorContent(page, { type: "doc", content: [{ type: "paragraph" }] });
  await page.locator(EDITOR).click();
  await page.keyboard.type("/");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("option", { name: "Image", exact: true }).click();
  await (await chooser).setFiles({
    name: "single.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_BASE64, "base64"),
  });
  await page.waitForTimeout(3000);
  const uploadResolvedUnderAppMocks = (await page.locator(`${EDITOR} img`).count()) > 0;
  console.log(
    `[1b-upload-probe] resolved=${uploadResolvedUnderAppMocks} events=${JSON.stringify(diagnostics.uploadEvents)}`,
  );

  const halfMarkdown = await setEditorContent(page, {
    type: "doc",
    content: [
      { type: "image", attrs: { src: SVG_SRC, alt: "«half» left" } },
      { type: "image", attrs: { src: SVG_SRC, alt: "«half» right" } },
      { type: "paragraph" },
    ],
  });
  await page.waitForFunction((selector) => {
    return Array.from(document.querySelectorAll(`${selector} img`)).every((img) => {
      const el = img as HTMLImageElement;
      return el.complete && el.naturalWidth > 0;
    });
  }, EDITOR);
  expect(halfMarkdown).toContain("![«half» left]");
  expect(halfMarkdown).toContain("![«half» right]");

  const desktopEditor = await editorImageBoxes(page);
  assertSideBySide("editor desktop half images", desktopEditor.rootWidth, desktopEditor.boxes);
  const desktopReaderBoxes = await installReaderFixture(page);
  assertSideBySide("reader desktop post-img-half figures", 672, desktopReaderBoxes);

  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(250);
  const mobileEditor = await editorImageBoxes(page);
  assertStacked("editor mobile half images", mobileEditor.rootWidth, mobileEditor.boxes);
  const mobileReaderBoxes = await installReaderFixture(page);
  assertStacked("reader mobile post-img-half figures", 375, mobileReaderBoxes);
  console.log(
    `[1b-layout/1c] markdown=${JSON.stringify(halfMarkdown)} desktopEditor=${JSON.stringify(desktopEditor)} mobileEditor=${JSON.stringify(mobileEditor)} desktopReader=${JSON.stringify(desktopReaderBoxes)} mobileReader=${JSON.stringify(mobileReaderBoxes)}`,
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await setEditorContent(page, { type: "doc", content: [{ type: "paragraph" }] });
  await page.locator(EDITOR).click();
  await page.keyboard.type(YOUTUBE_URL);
  await expect
    .poll(() => getMarkdown(page), { timeout: 5000 })
    .toContain("youtube.com/watch?v=dQw4w9WgXcQ");
  const youtubeMarkdown = await getMarkdown(page);
  const youtubeLines = youtubeMarkdown.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const standaloneYoutube = youtubeLines.some(
    (line) =>
      line === YOUTUBE_URL ||
      line === `<${YOUTUBE_URL}>` ||
      line === `[${YOUTUBE_URL}](${YOUTUBE_URL})`,
  );
  expect(standaloneYoutube, `YouTube URL should be standalone in markdown: ${youtubeMarkdown}`).toBe(true);

  captured.blocks = null;
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();
  const embedBlock = captured.blocks!.find((block) => block.type === "EMBED");
  expect(embedBlock?.content).toBe(YOUTUBE_URL);
  console.log(`[2] markdown=${JSON.stringify(youtubeMarkdown)} blocks=${JSON.stringify(captured.blocks)}`);

  console.log(`[diagnostics] console=${JSON.stringify(diagnostics.consoleMessages)} requestFailures=${JSON.stringify(diagnostics.requestFailures)}`);
});
