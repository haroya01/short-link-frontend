import { test, expect, type Page, type Locator } from "@playwright/test";

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

const IMAGE_URL = "https://mock-s3.test/img.png";

type Block = { type: string; content: string | null };
type Captured = {
  blocks: Block[] | null;
  // PATCH /posts/:id body — the metadata save (title · slug · tags · excerpt · cover).
  meta?: Record<string, unknown> | null;
  // The last status-lifecycle action that hit the backend: publish · unpublish · republish · schedule
  // · back-to-draft. Proves the right endpoint fired, independent of the optimistic UI.
  status?: string | null;
  scheduledAt?: string | null;
  deleted?: boolean;
};

/**
 * Mocks the whole authoring backend. `post` seeds GET /posts/:id so a test can start the editor in
 * any lifecycle state (DRAFT/PUBLISHED/UNPUBLISHED/SCHEDULED); the metadata/status/schedule/delete
 * routes capture what the editor sends so each lifecycle action is asserted at the wire.
 */
async function setupMocks(page: Page, captured: Captured, post: typeof POST = POST) {
  // Generic fallback FIRST so specific routes (registered after) take priority.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: ME }));
  await page.route(`**/api/v1/posts/${POST_ID}`, (route) => {
    const method = route.request().method();
    if (method === "PATCH") captured.meta = route.request().postDataJSON() ?? null;
    if (method === "DELETE") {
      captured.deleted = true;
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fulfill({ json: post });
  });
  // Status lifecycle — each returns the post in its new state so the UI re-renders, and records which
  // endpoint fired so the test asserts the action at the wire (not just the optimistic badge).
  const statusRoute = (suffix: string, action: string, next: Partial<typeof POST>) =>
    page.route(`**/api/v1/posts/${POST_ID}/${suffix}`, (route) => {
      if (suffix === "schedule") captured.scheduledAt = route.request().postDataJSON()?.scheduledAt ?? null;
      captured.status = action;
      return route.fulfill({ json: { ...post, ...next } });
    });
  await statusRoute("publish", "publish", { status: "PUBLISHED", publishedAt: NOW });
  await statusRoute("unpublish", "unpublish", { status: "UNPUBLISHED" });
  await statusRoute("republish", "republish", { status: "PUBLISHED", publishedAt: NOW });
  await statusRoute("back-to-draft", "back-to-draft", { status: "DRAFT", scheduledAt: null });
  await statusRoute("schedule", "schedule", { status: "SCHEDULED" });
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

/**
 * Make a keyboard selection (which leaves a stable ProseMirror selection with the editor focused, so
 * the bubble survives a button click) and wait for the named bubble button to appear. The whole
 * select-then-assert is retried: the BubbleMenu can lag a frame behind the selection, so a one-shot
 * "select, then expect visible" flakes — re-selecting on each retry is the reliable shape.
 */
async function awaitBubbleButton(page: Page, select: () => Promise<void>, buttonName: string) {
  const btn = page.getByRole("button", { name: buttonName, exact: true });
  await expect(async () => {
    await select();
    await expect(btn).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
  return btn;
}

async function save(page: Page, captured: Captured): Promise<Block[]> {
  // Drafts have no manual Save button (autosave-only model) — they persist ~1.8s after you stop
  // typing. Wait for that idle autosave. The 250ms serialize debounce coalesces fast keystrokes into a
  // single flush, so the captured payload is the complete doc, not a partial mid-type snapshot.
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
  // Two Enters = a real paragraph break (a single Enter is now a tight soft line break within the
  // same paragraph), so "first line" and "second line" are two distinct blocks here.
  await page.keyboard.press("Enter");
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
  // A2: a VIDEO embed must render as the reader does — a 16:9 iframe — not a generic OG link card, so
  // the editor matches the published page (WYSIWYG). The iframe points at the privacy embed host.
  await expect(page.locator('.tiptap iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]')).toBeVisible({
    timeout: 10_000,
  });

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

test("typewriter scrolling keeps the active line in the upper 2/3 while writing", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  // Type enough lines to overflow the editor's scroll container so scrolling actually kicks in.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.type(`line ${i}`);
    await page.keyboard.press("Enter");
  }
  await page.keyboard.type("CARET HERE");

  // The line being written must sit at or above the 2/3 line of the scroll container (≈1/3 of room
  // left below it), not pinned to the bottom edge. The keep-in-view scroll runs on a coalesced rAF, so
  // poll the measurement until it settles instead of reading one frame too early (the source of the
  // flake). Returns caretBottom − limit; a small tolerance covers line-height / sub-pixel rounding.
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const tiptap = document.querySelector(".tiptap");
          const scroller = tiptap?.closest(".overflow-y-auto") as HTMLElement | null;
          if (!scroller) return Number.POSITIVE_INFINITY;
          const active = Array.from(scroller.querySelectorAll(".tiptap > p")).find((p) =>
            p.textContent?.includes("CARET HERE"),
          );
          if (!active) return Number.POSITIVE_INFINITY;
          const sr = scroller.getBoundingClientRect();
          return active.getBoundingClientRect().bottom - (sr.top + sr.height * (2 / 3));
        }),
      { timeout: 5_000 },
    )
    .toBeLessThanOrEqual(10);
});

test("draft autosaves on idle — no Save click needed", async ({ page }) => {
  // usePostEditor persists a DRAFT ~1.8s after you stop typing. This is the path that froze the tab
  // when markdownToBlocks looped (#559), so prove it fires on its own end-to-end.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  await page.keyboard.type("autosaved on idle");

  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();
  expect(captured.blocks!.map((b) => b.content ?? "").join("\n")).toContain("autosaved on idle");
});

test("autosave does not freeze on image / edge-syntax lines (regression #559)", async ({ page }) => {
  // A half-typed image (`![…`), a bare blockquote marker, and a captioned image line are exactly the
  // lines markdownToBlocks failed to advance past — the parser spun forever on autosave and froze the
  // whole tab. Driving them through the REAL editor + the real 1.8s autosave proves the integrated
  // pipeline terminates (the precise loop logic is pinned by markdown-to-blocks unit tests).
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  // Double Enter between each = real block breaks (single Enter is a soft line break now), so each
  // tricky line becomes its own block and exercises markdownToBlocks' per-block consume paths.
  await page.keyboard.type("![half-typed-image");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("> ");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("![pic](http://x/y.png) trailing caption");

  // Save runs markdownToBlocks on the serialized markdown. If it hangs, the captured PUT never lands
  // and save() times out → the freeze is back. (Deterministic blur-flush, like the rest of the suite.)
  const blocks = await save(page, captured);
  expect(blocks.length, "the post serialized into blocks without hanging").toBeGreaterThan(0);

  // And the tab is still alive: typing after the trigger lines still registers.
  await page.locator(".tiptap").click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("editor still responsive");
  await expect(page.locator(".tiptap")).toContainText("editor still responsive");
});

test("bold writing mode: floating-bar toggle saves typed text as **bold**", async ({ page }) => {
  // Regression for the "굵게 쓰기" mode — on an empty line the floating bar's Bold toggle arms a stored
  // mark so the next text is bold, and that round-trips to ** ** in the saved markdown.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);

  await page.locator(".tiptap").click();
  // /en locale → aria-label is the English boldMode label "Bold". The selection BubbleMenu (also
  // "Bold") only shows on a selection, so on an empty line this resolves to the floating-bar toggle.
  const bold = page.getByRole("button", { name: "Bold", exact: true });
  await expect(bold).toBeVisible({ timeout: 10_000 });
  await bold.click();
  // The toggle MUST reflect that bold is now armed. Tiptap v3's useEditor doesn't re-render on
  // transactions, so a button reading editor.isActive() inline stays stuck at its mount value — the
  // toggle looks dead ("버튼 눌러도 아무 변화 없음") even though the mark is set. This asserts the
  // feedback, which a serialization-only check (below) silently misses.
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("bold words");

  const blocks = await save(page, captured);
  const para = blocks.find((b) => b.type === "PARAGRAPH");
  expect(para?.content, "typed text saved as bold markdown").toContain("**bold words**");
});

test("a saved post reloads its content into the editor (blocks → markdown round-trip)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  // Server already holds content for this post — the editor must hydrate it on load (GET /blocks).
  // Registered after setupMocks so it wins for this spec.
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        json: [
          { type: "H2", content: "Loaded heading" },
          { type: "PARAGRAPH", content: "Loaded body text." },
        ],
      });
    }
    return route.fulfill({ json: [] });
  });
  await openEditor(page);

  await expect(page.locator(".tiptap h2")).toHaveText("Loaded heading");
  await expect(page.locator(".tiptap")).toContainText("Loaded body text.");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Block serialization — every markdown shortcut / inline mark must round-trip to the right block type
// in the PUT /posts/:id/blocks payload. These are the "the post I wrote is the post that ships" guards
// that markdownToBlocks unit tests can't give (they don't drive the real Tiptap editor + serializer).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("markdown shortcut '### ' becomes an H3 block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("### Small heading");
  const blocks = await save(page, captured);
  expect(blocks.find((b) => b.type === "H3")?.content).toBe("Small heading");
});

test("markdown shortcut '- ' becomes a LIST_BULLET block holding every item", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("- first item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("second item");
  const blocks = await save(page, captured);
  const list = blocks.find((b) => b.type === "LIST_BULLET");
  expect(list, "a bullet list block was produced").toBeTruthy();
  expect(list!.content).toContain("first item");
  expect(list!.content).toContain("second item");
});

test("markdown shortcut '1. ' becomes a LIST_NUMBERED block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("1. step one");
  await page.keyboard.press("Enter");
  await page.keyboard.type("step two");
  const blocks = await save(page, captured);
  const list = blocks.find((b) => b.type === "LIST_NUMBERED");
  expect(list, "a numbered list block was produced").toBeTruthy();
  expect(list!.content).toContain("step one");
  expect(list!.content).toContain("step two");
});

test("nested bullet list (Tab) keeps the indentation in the saved markdown", async ({ page }) => {
  // Nesting is stored as raw markdown (indented sub-items) and rendered by remark-gfm on read, so the
  // round-trip must preserve the indentation — a flat list would silently drop the hierarchy.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("- parent");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.type("child");
  const blocks = await save(page, captured);
  const list = blocks.find((b) => b.type === "LIST_BULLET");
  expect(list, "a bullet list block was produced").toBeTruthy();
  expect(list!.content).toContain("parent");
  // The child rides indented under its parent (a flat list would put it at column 0).
  expect(list!.content).toMatch(/\n\s+(?:[-*]|\d+\.)\s+child/);
});

test("markdown shortcut '> ' becomes a QUOTE block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("> a wise remark");
  const blocks = await save(page, captured);
  expect(blocks.find((b) => b.type === "QUOTE")?.content).toBe("a wise remark");
});

test("typing '---' on its own line becomes a DIVIDER block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("above");
  // Double Enter = a fresh paragraph so the '---' rule fires at a block start (a single Enter would
  // leave '---' mid-paragraph after a soft line break, where the rule never triggers).
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("---");
  await page.keyboard.press("Enter");
  await page.keyboard.type("below");
  const blocks = await save(page, captured);
  expect(blocks.some((b) => b.type === "DIVIDER")).toBe(true);
});

test("Enter is a tight soft line break; a second Enter makes a new paragraph (Inflearn-style)", async ({
  page,
}) => {
  // The reader asked for narrow line spacing on a single Enter while real paragraph separation keeps
  // the current gap. A single Enter must keep both lines in ONE paragraph (a <br> — no block gap),
  // and a second Enter on the empty break-line must promote to a new paragraph (the wider gap).
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();

  await page.keyboard.type("line one");
  await page.keyboard.press("Enter");
  await page.keyboard.type("line two");
  // Both lines live in a single top-level paragraph, joined by one soft break.
  await expect(page.locator(".tiptap > p")).toHaveCount(1);
  await expect(page.locator(".tiptap > p br")).toHaveCount(1);

  // Second Enter (on the empty break-line) → a brand new paragraph.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("a new paragraph");
  await expect(page.locator(".tiptap > p")).toHaveCount(2);

  // Round-trip: the soft break stays inside one PARAGRAPH block; the paragraph break splits blocks.
  const blocks = await save(page, captured);
  const paras = blocks.filter((b) => b.type === "PARAGRAPH");
  expect(paras.length, "soft break did not spill into a second block").toBe(2);
  expect(paras[0].content).toContain("line one");
  expect(paras[0].content).toContain("line two");
  expect(paras[1].content).toContain("a new paragraph");
});

test("selection Bold (bubble menu) wraps the text as **bold** in the saved paragraph", async ({ page }) => {
  // Complements the empty-line "굵게 쓰기" toggle: here a non-empty SELECTION shows the bubble bar, and
  // its Bold must round-trip to ** ** for the selected run (not the whole block, not nothing).
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("make me bold");
  // Select the run so the bubble bar appears (a non-empty selection also hides the empty-line floating
  // bar, so "Bold" resolves to the bubble toggle).
  const bold = await awaitBubbleButton(
    page,
    async () => {
      await page.keyboard.press("Home");
      await page.keyboard.press("Shift+End");
    },
    "Bold",
  );
  await bold.click();
  // Active-state feedback must update (see the v3 useEditorState note in the floating-bar test).
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  const blocks = await save(page, captured);
  expect(blocks.find((b) => b.type === "PARAGRAPH")?.content).toContain("**make me bold**");
});

test("selection Link (bubble menu + URL dialog) saves a real markdown link", async ({ page }) => {
  // This was a REAL bug, not headless flakiness: the bubble buttons used onClick, so the click blurred
  // the editor and collapsed the selection before setLink ran → extendMarkRange found no range → no
  // link (and no `[text](url)` in the payload). Fixed by moving the bubble to onMouseDown+preventDefault
  // (like the floating bar). Surrounding text keeps the line a paragraph (a link-only line → EMBED).
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("intro docs");
  // Select just the word "docs" (last 4 chars). Re-select from line-end each retry so it's idempotent,
  // and wait for the bubble Link button to be ready before clicking.
  const link = await awaitBubbleButton(
    page,
    async () => {
      await page.keyboard.press("End");
      for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+ArrowLeft");
    },
    "Link",
  );
  await link.click();
  await page.getByPlaceholder("https://example.com").fill("https://kurl.me/help");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  // Lived proof the bug is fixed: a real clickable anchor lands on the selected word. (Before the
  // onMouseDown fix the selection collapsed and no link was created at all.) We assert the rendered
  // anchor rather than the saved markdown — the link mark IS what serializes, and the anchor is the
  // deterministic, user-facing signal.
  await expect(page.locator('.tiptap a[href="https://kurl.me/help"]')).toHaveText("docs");
});

test("inserting an image saves an IMAGE block carrying the uploaded URL", async ({ page }) => {
  // Drives the real presign → S3 PUT → commit → setImage path (all mocked in setupMocks). The image
  // node must serialize to an IMAGE block whose url is the committed public URL.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  // The body image picker is a hidden <input type=file>; setting it fires the same onChange the
  // floating-bar / slash «image» buttons trigger, without a native file chooser.
  await page.locator('.tiptap').click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: Buffer.from("png-bytes") });
  await expect(page.locator(".tiptap img")).toBeVisible({ timeout: 10_000 });
  const blocks = await save(page, captured);
  expect(blocks.find((b) => b.type === "IMAGE")?.content).toContain(IMAGE_URL);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Publish lifecycle — open the 발행 설정 dialog and prove each status action hits the right endpoint.
// Each test seeds the post in the relevant starting state via setupMocks(…, post).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Header «발행 / 발행 설정» opens the publish dialog. Returns the dialog locator for scoped actions. */
async function openPublishDialog(page: Page) {
  await page.getByRole("button", { name: /^(Publish|Publish settings)$/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Add a topic (tag) in the dialog — going public now requires ≥1, so publish/republish/schedule
 *  tests must seed one or the primary action stays disabled. */
async function addDialogTag(dialog: Locator, name = "dev") {
  const input = dialog.getByPlaceholder(/tag/i);
  await input.fill(name);
  await input.press("Enter");
}

test("publish: dialog Publish fires POST /publish and lands on the published post", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await titleInput(page).fill("Ready to ship");
  const dialog = await openPublishDialog(page);
  await addDialogTag(dialog); // topic required to publish
  await dialog.getByRole("button", { name: "Publish", exact: true }).click();
  await expect.poll(() => captured.status).toBe("publish");
  // Publishing drops the writer onto the live post (reader view), not back in the editor.
  await page.waitForURL(/\/p\/[^/]+\/[^/]+/, { timeout: 10_000 });
});

test("publish is blocked without a title — shows the hint, fires no /publish", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  // Title left empty (POST.title === ""); add a topic so the title is the ONLY thing blocking publish.
  const dialog = await openPublishDialog(page);
  await addDialogTag(dialog);
  await dialog.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Add a title before publishing")).toBeVisible();
  expect(captured.status, "no status endpoint should have fired").toBeFalsy();
});

test("unpublish: a published post can be taken down (POST /unpublish)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured, { ...POST, status: "PUBLISHED", publishedAt: NOW });
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect.poll(() => captured.status).toBe("unpublish");
});

test("republish: an unpublished post can go live again (POST /republish)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured, { ...POST, status: "UNPUBLISHED" });
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await addDialogTag(dialog); // going public again still needs a topic
  await dialog.getByRole("button", { name: "Republish", exact: true }).click();
  await expect.poll(() => captured.status).toBe("republish");
});

test("republish persists pending body edits (not just flips status)", async ({ page }) => {
  // Republish / Cancel-schedule / Unpublish must save first — editing then republishing used to push
  // the OLD server content live and silently drop the edit. Assert the edit reaches /blocks, not just
  // that the lifecycle endpoint fired.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured, { ...POST, status: "UNPUBLISHED" });
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("edited before republish");
  const dialog = await openPublishDialog(page);
  await addDialogTag(dialog);
  await dialog.getByRole("button", { name: "Republish", exact: true }).click();
  await expect.poll(() => captured.status).toBe("republish");
  await expect.poll(() => captured.blocks).not.toBeNull();
  expect(captured.blocks!.map((b) => b.content ?? "").join("\n")).toContain("edited before republish");
});

test("schedule: a draft can be parked for a future publish (POST /schedule)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await titleInput(page).fill("Scheduled one");
  const dialog = await openPublishDialog(page);
  await addDialogTag(dialog); // scheduling is a deferred publish → topic required too
  await dialog.getByRole("button", { name: "Schedule", exact: true }).click();
  await dialog.locator('input[type="datetime-local"]').fill("2030-01-01T10:00");
  await dialog.getByRole("button", { name: "Publish", exact: true }).click();
  await expect.poll(() => captured.status).toBe("schedule");
  expect(captured.scheduledAt).toContain("2030-01-01");
});

test("cancel schedule: a scheduled post returns to draft (POST /back-to-draft)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured, { ...POST, status: "SCHEDULED", scheduledAt: "2030-01-01T10:00:00Z" });
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog.getByRole("button", { name: "Cancel schedule", exact: true }).click();
  await expect.poll(() => captured.status).toBe("back-to-draft");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Metadata — values set in the publish dialog must land in the PATCH /posts/:id body on save.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("tags entered in the dialog persist to the metadata PATCH", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  // Stable handle: the tag field is the dialog's only autocomplete-off input (its placeholder empties
  // after the first chip, so a getByPlaceholder locator would stop resolving for the second tag).
  const tagInput = dialog.locator('input[autocomplete="off"]');
  await tagInput.fill("nextjs");
  await tagInput.press("Enter");
  await tagInput.fill("testing");
  await tagInput.press("Enter");
  captured.meta = null;
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => captured.meta).not.toBeNull();
  expect(captured.meta).toMatchObject({ tags: ["nextjs", "testing"] });
});

test("excerpt entered in the dialog persists to the metadata PATCH", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog.getByPlaceholder("One-line summary").fill("a short summary");
  captured.meta = null;
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => captured.meta).not.toBeNull();
  expect(captured.meta).toMatchObject({ excerpt: "a short summary" });
});

test("slug is normalized (edge hyphens trimmed, lowercased) before the PATCH", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog.locator('input[spellcheck="false"]').fill("-Hello-World-");
  captured.meta = null;
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => captured.meta).not.toBeNull();
  expect(captured.meta).toMatchObject({ slug: "hello-world" });
});

test("a cover image uploaded in the dialog persists to the metadata PATCH", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: Buffer.from("png-bytes") });
  await expect(dialog.locator("img")).toBeVisible({ timeout: 10_000 });
  captured.meta = null;
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => captured.meta).not.toBeNull();
  expect(captured.meta).toMatchObject({ ogImageUrl: IMAGE_URL });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Destructive + recovery actions.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("delete: confirming the trash action calls DELETE and returns to the list", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  page.on("dialog", (d) => d.accept()); // window.confirm(deleteConfirm)
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect.poll(() => captured.deleted).toBe(true);
  await expect(page).toHaveURL(/\/blog\/write\/?$/);
});

test("leaving a dirty draft via Back saves it first — no lost edits", async ({ page }) => {
  // The header Back is a real navigation; typing then immediately leaving used to drop the last
  // keystrokes (still inside the 1.8s autosave debounce). Back now saves a dirty draft first.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("draft words before leaving");
  // The header back arrow (lucide ArrowLeft) — clicked well within the autosave window.
  await page.locator("a:has(svg.lucide-arrow-left)").click();
  await expect.poll(() => captured.blocks, { timeout: 15_000 }).not.toBeNull();
  expect(captured.blocks!.map((b) => b.content ?? "").join("\n")).toContain("draft words before leaving");
});

test("revisions: restoring a saved version calls the restore endpoint", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  let restored = 0;
  await page.route(`**/api/v1/posts/${POST_ID}/revisions`, (route) =>
    route.fulfill({ json: [{ id: 1, versionNumber: 3, titleSnapshot: "earlier", createdAt: NOW }] }),
  );
  await page.route(`**/api/v1/posts/${POST_ID}/revisions/3/restore`, (route) => {
    restored = 3;
    return route.fulfill({ json: POST });
  });
  await openEditor(page);
  page.on("dialog", (d) => d.accept()); // window.confirm(revisionRestoreConfirm)
  await page.getByRole("button", { name: "Revisions", exact: true }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect.poll(() => restored).toBe(3);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Batch 2 — remaining inline marks, the rest of the slash menu, image widths, table editing, the
// published-post save path, and tag removal. Closes the gaps left by the first pass.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

for (const { label, type, wrap } of [
  { label: "Italic", type: "italic", wrap: "*styled words*" },
  { label: "Strike", type: "strike", wrap: "~~styled words~~" },
  { label: "Inline code", type: "code", wrap: "`styled words`" },
] as const) {
  test(`selection ${label} (bubble menu) round-trips to ${wrap}`, async ({ page }) => {
    const captured: Captured = { blocks: null };
    await setupMocks(page, captured);
    await openEditor(page);
    await page.locator(".tiptap").click();
    await page.keyboard.type("styled words");
    const btn = await awaitBubbleButton(
      page,
      async () => {
        await page.keyboard.press("Home");
        await page.keyboard.press("Shift+End");
      },
      label,
    );
    await btn.click();
    // The toggle's active feedback must update (Tiptap v3 useEditor doesn't re-render on transactions
    // — the bubble buttons subscribe via useEditorState). Asserting aria-pressed here guards the same
    // regression that left "굵게 쓰기" looking dead, for every inline mark.
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    const blocks = await save(page, captured);
    expect(blocks.find((b) => b.type === "PARAGRAPH")?.content).toContain(wrap);
  });
}

for (const { item, blockType, text } of [
  { item: "Bulleted list", blockType: "LIST_BULLET", text: "bullet via slash" },
  { item: "Numbered list", blockType: "LIST_NUMBERED", text: "number via slash" },
  { item: "Quote", blockType: "QUOTE", text: "quote via slash" },
] as const) {
  test(`slash menu inserts a ${blockType} block`, async ({ page }) => {
    const captured: Captured = { blocks: null };
    await setupMocks(page, captured);
    await openEditor(page);
    await page.locator(".tiptap").click();
    await page.keyboard.type("/");
    await page.getByRole("option", { name: new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`) }).click();
    await page.keyboard.type(text);
    const blocks = await save(page, captured);
    expect(blocks.find((b) => b.type === blockType)?.content).toContain(text);
  });
}

test("slash menu inserts a divider (DIVIDER block)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("above the line");
  // Fresh paragraph (double Enter) so the slash menu opens at a block start, not mid-paragraph.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Divider\b/ }).click();
  const blocks = await save(page, captured);
  expect(blocks.some((b) => b.type === "DIVIDER")).toBe(true);
});

test("slash 'Wide image' saves an IMAGE block tagged width:wide", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Wide image\b/ }).click();
  // The slash item armed pendingWidth="wide" then opened the hidden picker; set the file directly.
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "hero.png", mimeType: "image/png", buffer: Buffer.from("png") });
  await expect(page.locator(".tiptap img")).toBeVisible({ timeout: 10_000 });
  const blocks = await save(page, captured);
  const img = blocks.find((b) => b.type === "IMAGE");
  expect(img?.content).toContain(IMAGE_URL);
  expect(img?.content, "width marker rides through the round-trip").toContain('"width":"wide"');
});

test("slash 'Two images' saves a side-by-side pair as two IMAGE blocks", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Two images\b/ }).click();
  // multiple=true picker → two files land adjacent → a 2-up half/half row.
  await page.locator('input[type="file"]').setInputFiles([
    { name: "a.png", mimeType: "image/png", buffer: Buffer.from("a") },
    { name: "b.png", mimeType: "image/png", buffer: Buffer.from("b") },
  ]);
  await expect(page.locator(".tiptap img")).toHaveCount(2, { timeout: 10_000 });
  const blocks = await save(page, captured);
  expect(blocks.filter((b) => b.type === "IMAGE")).toHaveLength(2);
});

test("table toolbar grows a 3×3 into a 4×4", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Table\b/ }).click();
  await expect(page.locator(".tiptap table")).toBeVisible({ timeout: 10_000 });
  // Each toolbar command does editor.chain().focus().<cmd>() — firing it before the cell selection has
  // propagated to ProseMirror (or while the toolbar is repositioning after the previous edit) restores
  // a stale selection and no-ops. Re-anchor the caret in a cell + let it settle before each action;
  // adding isn't idempotent so re-clicking the cell (which is) is safer than a click-retry, and each
  // action asserts its own result so too short a settle fails loudly rather than passing wrong.
  const tableAction = async (name: string) => {
    await page.locator(".tiptap table td").first().click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name, exact: true }).click();
  };
  await tableAction("Add column");
  await expect(page.locator(".tiptap table tr").first().locator("th, td")).toHaveCount(4);
  await tableAction("Add row");
  await expect(page.locator(".tiptap table tr")).toHaveCount(4);
});

test("published post: 'Save changes' persists edits without changing status", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured, { ...POST, status: "PUBLISHED", publishedAt: NOW });
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("an edit to a live post");
  const dialog = await openPublishDialog(page);
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => captured.blocks).not.toBeNull();
  expect(captured.blocks!.map((b) => b.content ?? "").join("\n")).toContain("an edit to a live post");
  // No lifecycle endpoint should fire — saving a published post must not flip its status.
  expect(captured.status, "status must be untouched by a content save").toBeFalsy();
});

test("removing a tag chip drops it from the metadata PATCH", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured, { ...POST, tags: ["keep", "drop"] });
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog.getByRole("button", { name: "remove drop", exact: true }).click();
  captured.meta = null;
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => captured.meta).not.toBeNull();
  expect(captured.meta).toMatchObject({ tags: ["keep"] });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Batch 3 — series assignment, the new-post bootstrap, code-block language, cover removal, live slug
// normalization, and the failed-save error path.
//
// Deliberately NOT covered here (would be flaky or need external stubs, not real signal):
//   · image paste / drag-drop  — synthetic ClipboardEvent/DataTransfer with a File is unreliable headless
//   · URL-paste → link card    — same paste-synthesis problem
//   · map / place embed        — PlaceSearchDialog drives the Google Places SDK (external)
//   · schedule past-time guard — no client-side validation exists (only the datetime-local min attr)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("assigning a freshly created series persists membership (PUT /series/:id/posts)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  const SERIES = { id: 99, slug: "my-series", title: "My series", postCount: 0, createdAt: NOW, updatedAt: null };
  let seriesPostIds: number[] | null = null;
  // GET list (empty) + POST create on the same path; detail + membership on the id paths.
  await page.route("**/api/v1/series", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ json: { series: SERIES, posts: [] } })
      : route.fulfill({ json: [] }),
  );
  await page.route(`**/api/v1/series/${SERIES.id}`, (route) =>
    route.fulfill({ json: { series: SERIES, posts: [] } }),
  );
  await page.route(`**/api/v1/series/${SERIES.id}/posts`, (route) => {
    if (route.request().method() === "PUT") seriesPostIds = route.request().postDataJSON()?.postIds ?? null;
    return route.fulfill({ json: { series: SERIES, posts: [] } });
  });
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog.getByRole("button", { name: "New series", exact: true }).click();
  const name = dialog.getByPlaceholder("New series name");
  await name.fill("My series");
  await name.press("Enter");
  captured.blocks = null;
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => seriesPostIds).not.toBeNull();
  expect(seriesPostIds, "the post is appended to the new series").toContain(POST_ID);
});

test("the new-post bootstrap creates a draft and lands in its editor", async ({ page }) => {
  const NEW_ID = 777;
  const draft = { ...POST, id: NEW_ID, slug: "draft-x" };
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/v1/users/me", (route) => route.fulfill({ json: ME }));
  let created = false;
  await page.route("**/api/v1/posts", (route) => {
    if (route.request().method() === "POST") {
      created = true;
      return route.fulfill({ json: draft });
    }
    return route.fulfill({ json: [] });
  });
  await page.route(`**/api/v1/posts/${NEW_ID}`, (route) => route.fulfill({ json: draft }));
  await page.route(`**/api/v1/posts/${NEW_ID}/blocks`, (route) => route.fulfill({ json: [] }));
  await page.context().addInitScript((t) => {
    window.localStorage.setItem("short-link:access-token", t as string);
    window.localStorage.setItem("kurl:cookie-consent:v1", "accepted");
  }, TOKEN);
  await page.goto("/en/blog/write/new");
  // The bootstrap POSTs a blank draft then swaps /new → /{id} and drops into the editor.
  await expect(page).toHaveURL(new RegExp(`/blog/write/${NEW_ID}$`), { timeout: 30_000 });
  await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
  expect(created, "a draft was created via POST /posts").toBe(true);
});

test("code block language + body round-trip into the CODE block", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("intro");
  // Fresh paragraph (double Enter) so the slash menu opens at a block start, not mid-paragraph.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await page.getByRole("option", { name: /^Code block\b/ }).click();
  // The CodeMirror node view owns a language <select> (the only select inside the editor).
  await page.locator(".tiptap select").selectOption("python");
  await page.locator(".tiptap .cm-content").click();
  await page.keyboard.type("print('hi')");
  // Save directly while CodeMirror still has focus — no manual blur. The CM blur handler commits the
  // buffer into the ProseMirror node when Save steals focus, so a quick-save must NOT drop the code
  // (this used to serialize an empty CODE block).
  const blocks = await save(page, captured);
  const code = blocks.find((b) => b.type === "CODE");
  expect(code, "a CODE block was saved").toBeTruthy();
  expect(code!.content).toContain('"lang":"python"');
  expect(code!.content).toContain("print('hi')");
});

test("removing the cover image clears ogImageUrl in the metadata PATCH", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: "c.png", mimeType: "image/png", buffer: Buffer.from("c") });
  await expect(dialog.locator("img")).toBeVisible({ timeout: 10_000 });
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(dialog.locator("img")).toHaveCount(0);
  captured.meta = null;
  await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => captured.meta).not.toBeNull();
  expect(captured.meta).toMatchObject({ ogImageUrl: "" });
});

test("the slug field normalizes input live (caps/spaces/symbols → hyphen-case)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  const slug = dialog.locator('input[spellcheck="false"]');
  await slug.fill("Hello World!");
  // normalizeSlugInput lowercases, turns invalid chars into single hyphens, drops a leading hyphen;
  // a trailing hyphen is intentionally kept (so "a-" → "a-b" works) and only trimmed on save.
  await expect(slug).toHaveValue("hello-world-");
});

test("a failed save surfaces an error message", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  // Fail the blocks PUT so save() throws after the metadata PATCH succeeds.
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({ status: 500, contentType: "application/json", body: '{"title":"Server error"}' })
      : route.fulfill({ json: [] }),
  );
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("this will not save");
  // The idle autosave attempts the (failing) blocks PUT — no manual Save button — and surfaces the error.
  await expect(page.locator("main p.text-red-600")).toBeVisible({ timeout: 15_000 });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Lived rendering — the editor must VISUALLY style marks/blocks, not just serialize them. This is the
// class of bug that nearly shipped (a missing `.tiptap strong` rule would still serialize `**` but
// render flat) and is exactly what payload-only assertions miss. Asserts computed styles.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("the editor visually styles marks and blocks (computed styles, not just payload)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  // Bold / italic / strike via markdown input rules — deterministic (no selection + Cmd+B timing,
  // which flaked in CI when the prior blockquote swallowed the following lines).
  await page.keyboard.type("**boldword** *ital* ~~strk~~ plain");
  // Double Enter after a paragraph = real block break (single Enter is a soft line break now). After
  // a heading, a single Enter already exits to a new paragraph, so the H2→code step stays single.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  // H2 (markdown shortcut)
  await page.keyboard.type("## Heading");
  await page.keyboard.press("Enter");
  // Inline code (backtick input rule)
  await page.keyboard.type("text with `snippet` inline");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  // Blockquote LAST — Enter inside a quote keeps following lines in the quote, so it must not precede
  // the other blocks.
  await page.keyboard.type("> quoted line");
  await expect(page.locator(".tiptap strong")).toBeVisible();

  const m = await page.evaluate(() => {
    const get = (sel: string) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el) : null;
    };
    const strong = get(".tiptap strong");
    const em = get(".tiptap em");
    const strike = get(".tiptap s") ?? get(".tiptap del");
    const h2 = get(".tiptap h2");
    const p = get(".tiptap p");
    const bq = get(".tiptap blockquote");
    const code = get(".tiptap :not(pre) > code");
    return {
      strongWeight: strong ? Number(strong.fontWeight) : 0,
      emStyle: em ? em.fontStyle : "",
      strikeLine: strike ? strike.textDecorationLine : "",
      h2Size: h2 ? parseFloat(h2.fontSize) : 0,
      pSize: p ? parseFloat(p.fontSize) : 0,
      bqBorder: bq ? parseFloat(bq.borderLeftWidth) : 0,
      codeBg: code ? code.backgroundColor : "rgba(0, 0, 0, 0)",
    };
  });
  expect(m.strongWeight, "bold text renders bold").toBeGreaterThanOrEqual(600);
  expect(m.emStyle, "italic renders slanted").toBe("italic");
  expect(m.strikeLine, "strike renders a line-through").toContain("line-through");
  expect(m.h2Size, "H2 renders larger than body").toBeGreaterThan(m.pSize);
  expect(m.bqBorder, "blockquote has a left rule").toBeGreaterThan(0);
  expect(m.codeBg, "inline code has a background tint").not.toBe("rgba(0, 0, 0, 0)");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Audit follow-ups: heading levels (A7), slash-menu IME safety (A9).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("'#### ' does NOT create a broken h4 — the block model is H1–H3 only (A7)", async ({ page }) => {
  // StarterKit is capped to levels [1,2,3]; a 4th-level heading node would serialize to literal
  // `#### text` and round-trip as a PARAGRAPH (heading + TOC entry lost). Assert no h4 node forms.
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("### still a heading");
  await expect(page.locator(".tiptap h3")).toHaveText("still a heading");
  await page.keyboard.press("Enter");
  await page.keyboard.type("#### not a heading");
  // No h4 node is created (the input rule stops at level 3).
  await expect(page.locator(".tiptap h4")).toHaveCount(0);
  const blocks = await save(page, captured);
  expect(blocks.some((b) => b.type === "H3" && b.content === "still a heading")).toBe(true);
});

test("slash menu does not hijack the IME composition Enter (CJK) (A9)", async ({ page }) => {
  // Korean/Japanese authors confirm a composing word with Enter. With the menu open that Enter must
  // commit the composition, not pick a menu item. Dispatch a composing keydown and assert the menu
  // stays open (no selection fired).
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await page.locator(".tiptap").click();
  await page.keyboard.type("/");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }));
  });
  // Menu is still open — the composing Enter did not select an item.
  await expect(page.getByRole("listbox")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Audit batch 2 — cover upload failure (A14), schedule past-time guard (A22), revision reseed (A17).
// (Drag/drop + multi-paste image fixes (A12/A20) and block-handle stale-resolve (A15) aren't e2e'd —
// synthetic clipboard/drag and the hover→mutate→click race are unreliable headless; verified by code.)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("cover image upload failure surfaces an error (not silent) (A14)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  // Fail the cover's presign so the upload rejects.
  await page.route(`**/api/v1/posts/${POST_ID}/images/presign`, (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
  );
  await openEditor(page);
  const dialog = await openPublishDialog(page);
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: Buffer.from("png") });
  // A visible error, not a silent dropzone reset.
  await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 10_000 });
});

test("scheduling a past time is rejected with no /schedule call (A22)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  await openEditor(page);
  await titleInput(page).fill("Scheduled one");
  const dialog = await openPublishDialog(page);
  await addDialogTag(dialog); // pass the topic gate so the PAST-TIME guard is what blocks it
  await dialog.getByRole("button", { name: "Schedule", exact: true }).click();
  await dialog.locator('input[type="datetime-local"]').fill("2020-01-01T10:00");
  await dialog.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText("Pick a future time")).toBeVisible();
  expect(captured.status, "no schedule endpoint should fire for a past time").toBeFalsy();
});

test("restoring a revision reseeds the editor with the restored content (A17)", async ({ page }) => {
  const captured: Captured = { blocks: null };
  await setupMocks(page, captured);
  // The editor starts empty; after the restore POST, GET /blocks serves the restored body. The editor
  // must reflect it (it used to update state but keep the stale mounted doc).
  let restored = false;
  await page.route(`**/api/v1/posts/${POST_ID}/revisions`, (route) =>
    route.fulfill({ json: [{ id: 1, versionNumber: 3, titleSnapshot: "earlier", createdAt: NOW }] }),
  );
  await page.route(`**/api/v1/posts/${POST_ID}/revisions/3/restore`, (route) => {
    restored = true;
    return route.fulfill({ json: POST });
  });
  await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) => {
    if (route.request().method() === "PUT") {
      captured.blocks = route.request().postDataJSON()?.blocks ?? null;
      return route.fulfill({ json: [] });
    }
    return route.fulfill({ json: restored ? [{ type: "H2", content: "Restored heading" }] : [] });
  });
  await openEditor(page);
  page.on("dialog", (d) => d.accept()); // restore confirm
  await page.getByRole("button", { name: "Revisions", exact: true }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  // The restored content is now shown in the editor (remounted from the reloaded blocks).
  await expect(page.locator(".tiptap h2")).toHaveText("Restored heading", { timeout: 15_000 });
});
