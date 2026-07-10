import { test, expect, type Page } from "@playwright/test";

/**
 * Reader highlights — the authoring path on a published post: select text → the floating action bar's
 * "Highlight" → the span is painted back into the body as a `<mark class="kurl-highlight">` carrying
 * the quote (see post-highlights.tsx + highlight-anchor.ts). Like blog-post-render, this runs in
 * MOCK-ON (NEXT_PUBLIC_USE_MOCKS=1): the post page is a Server Component that fetches server-side, so
 * Playwright can't route-intercept it — the in-memory mock serves a deterministic post AND seeds a
 * signed-in viewer, so the highlight action commits instead of bouncing to a Google redirect.
 *
 * Wire-payload note: in mock-on the create is an in-memory call, not an HTTP POST, so there is no
 * request body to assert at the network layer. Instead we assert the observable contract of that
 * payload — the created highlight round-trips through create → list → paint and comes back rendered as
 * a `<mark>` carrying the EXACT selected quote (which is only possible if blockOrder/offsets/quote were
 * captured correctly). The pure offset/quote painting is additionally unit-tested in
 * highlight-anchor.test.ts.
 *
 * The #789 regression this pins: a native `<mark>` has a UA default of `color: black` (unreadable on a
 * dark page) + a yellow fill. The fix paints via the `.kurl-highlight` CLASS (globals.css) with
 * `color: inherit` and a green tint that has a dark-mode variant. We assert the rendered mark inherits
 * the body text color (not UA black), carries no inline color/background, and shows the class tint — in
 * BOTH color schemes. Dark mode is driven by the app's `theme` cookie (the app deliberately ignores the
 * OS `prefers-color-scheme`, so Playwright's `colorScheme: 'dark'` would NOT toggle `.dark`).
 */
test.use({ viewport: { width: 1280, height: 900 } });

// A seeded mock post whose body covers every block type (see modules/blog/api/_mocks.ts).
const POST_PATH = "/en/p/dohyun/nextjs-14-app-router-blog";

const LIGHT_TINT = { r: 5, g: 150, b: 105, a: 0.1 };
const DARK_TINT = { r: 16, g: 185, b: 129, a: 0.16 };

type Rgba = { r: number; g: number; b: number; a: number };

/** Parse a computed `rgb()/rgba()` color string into channels (alpha defaults to 1 for opaque rgb). */
function parseColor(s: string): Rgba {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`unexpected color: ${s}`);
  const [r, g, b, a] = m[1].split(",").map((n) => parseFloat(n.trim()));
  return { r, g, b, a: Number.isFinite(a) ? a : 1 };
}

function expectTint(actual: string, want: Rgba) {
  const got = parseColor(actual);
  expect({ r: got.r, g: got.g, b: got.b }).toEqual({ r: want.r, g: want.g, b: want.b });
  // Alpha formatting can vary by a hair across engines; compare with a small tolerance.
  expect(Math.abs(got.a - want.a)).toBeLessThan(0.02);
}

/** Wait until the reader is signed-in and the client islands have hydrated. The comment composer's
 *  resting placeholder is a reliable proxy that the comments island mounted — it renders in place of the
 *  Tiptap editor, which is now lazy-loaded on first tap (we do NOT click it here: that would mount the
 *  editor and steal focus from the highlight selection). The settle lets the mock /me resolve so the
 *  quick-highlight commits instead of redirecting to Google. (networkidle never fires — the page holds
 *  a live connection open.) */
async function waitReady(page: Page) {
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("comment-composer-placeholder")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
}

/**
 * Select a clean word-run inside a direct-child block of `.prose-post` and finalize on mouseup —
 * exactly what the highlight action bar listens for. Returns the selected quote so the caller can
 * assert the painted mark carries it. The run is whitespace-bounded so the trimmed quote and the
 * painted [startOffset, endOffset) span match to the character.
 */
async function selectRun(page: Page): Promise<string> {
  return page.evaluate(() => {
    const root = document.querySelector(".prose-post")!;
    const block = Array.from(root.children).find(
      (el) => (el.textContent || "").trim().length > 20,
    ) as HTMLElement;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node: Text | null = null;
    while (walker.nextNode()) {
      if ((walker.currentNode.textContent || "").trim().length >= 12) {
        node = walker.currentNode as Text;
        break;
      }
    }
    const data = (node ?? (block.firstChild as Text)).data;
    // A whitespace-bounded run of up to 12 chars: skip leading space, then take non-space chars.
    let i = 0;
    while (i < data.length && /\s/.test(data[i])) i++;
    let j = i;
    while (j < data.length && j - i < 12 && !/\s/.test(data[j])) j++;
    const range = document.createRange();
    range.setStart(node ?? (block.firstChild as Text), i);
    range.setEnd(node ?? (block.firstChild as Text), j);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    return data.slice(i, j);
  });
}

/** Select a run, tap "Highlight", and return the painted mark locator + the quote it should carry. */
async function makeHighlight(page: Page) {
  const quote = await selectRun(page);
  const bar = page.getByRole("toolbar");
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "Highlight", exact: true }).click();
  const mark = page.locator("mark.kurl-highlight").first();
  await expect(mark).toBeVisible({ timeout: 10_000 });
  return { mark, quote };
}

test("selecting text → Highlight paints a class-based <mark> carrying the exact quote", async ({
  page,
}) => {
  await page.goto(POST_PATH);
  await waitReady(page);
  const { mark, quote } = await makeHighlight(page);

  // The painted span carries the selected text and is wired to open its thread (data-hl-id).
  await expect(mark).toHaveText(quote);
  await expect(mark).toHaveAttribute("data-hl-id", /\d+/);

  // #789: painted via the CLASS, not an inline style — no inline color/background leaks onto the mark.
  const inline = await mark.evaluate((el) => ({
    bg: (el as HTMLElement).style.backgroundColor,
    color: (el as HTMLElement).style.color,
  }));
  expect(inline.bg, "no inline background — the .kurl-highlight class paints it").toBe("");
  expect(inline.color, "no inline color — the mark inherits the body text color").toBe("");
});

test("the highlight <mark> inherits body text color and shows the light-mode green tint", async ({
  page,
}) => {
  await page.goto(POST_PATH);
  await waitReady(page);
  const { mark } = await makeHighlight(page);

  const seen = await mark.evaluate((el) => {
    const cs = getComputedStyle(el);
    const parent = getComputedStyle(el.parentElement!);
    return { color: cs.color, bg: cs.backgroundColor, parentColor: parent.color };
  });
  // Text color follows the surrounding body (color: inherit), NOT the UA <mark> black.
  expect(seen.color).toBe(seen.parentColor);
  expect(seen.color, "the mark must not fall back to the UA <mark> black").not.toBe("rgb(0, 0, 0)");
  // The fill is the document-quiet class tint (accent-600 @ 0.10), not the UA <mark> yellow.
  expectTint(seen.bg, LIGHT_TINT);
});

test("the highlight <mark> stays readable in dark mode (dark tint + inherited light text) — #789", async ({
  page,
  context,
}) => {
  // Drive dark mode the way the app does: a `theme` cookie (it ignores OS prefers-color-scheme).
  await context.addCookies([{ name: "theme", value: "dark", domain: "localhost", path: "/" }]);
  await page.goto(POST_PATH);
  expect(
    await page.evaluate(() => document.documentElement.classList.contains("dark")),
    "the theme cookie applied .dark on <html>",
  ).toBe(true);
  await waitReady(page);
  const { mark } = await makeHighlight(page);

  const seen = await mark.evaluate((el) => {
    const cs = getComputedStyle(el);
    const parent = getComputedStyle(el.parentElement!);
    return { color: cs.color, bg: cs.backgroundColor, parentColor: parent.color };
  });
  // The killer bug: UA black text on a dark page. The mark must inherit the light body text instead.
  expect(seen.color).toBe(seen.parentColor);
  expect(seen.color, "dark-mode text must not be UA <mark> black").not.toBe("rgb(0, 0, 0)");
  // Dark tint is the brighter accent-500 @ 0.16 variant (accent-600 muddies into a dark page).
  expectTint(seen.bg, DARK_TINT);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Notes · threads · deep links — the highlight's social layer past the plain paint. A note turns a
// mark into a thread carrier (underlined); clicking any mark opens its thread; a reply lands in it;
// and a ?hl link scrolls a passage into view. All in-memory in mock-on (see modules/blog/api/highlights.ts).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("selecting text → Note saves a memo and paints the mark as a thread carrier (underlined)", async ({
  page,
}) => {
  await page.goto(POST_PATH);
  await waitReady(page);
  const quote = await selectRun(page);
  const bar = page.getByRole("toolbar");
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "Note", exact: true }).click();

  // The memo composer is a dialog with the same WYSIWYG input as comments (no raw-markdown textarea).
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.locator(".tiptap-comment").click();
  await page.keyboard.type("worth remembering");
  await sheet.getByRole("button", { name: "Save", exact: true }).click();

  // A noted highlight is a "thread carrier": it paints with the extra .kurl-highlight--thread class
  // (the underline that says "there's a conversation here"), even as a single reader's mark.
  const threadMark = page.locator("mark.kurl-highlight--thread").first();
  await expect(threadMark).toBeVisible({ timeout: 10_000 });
  await expect(threadMark).toHaveText(quote);
});

test("clicking a painted highlight opens its thread sheet showing the exact quote", async ({ page }) => {
  await page.goto(POST_PATH);
  await waitReady(page);
  const { mark, quote } = await makeHighlight(page);

  await mark.click();
  // The thread dialog is labelled by its quoted passage (aria-labelledby="hl-thread-quote").
  const thread = page.getByRole("dialog");
  await expect(thread).toBeVisible({ timeout: 10_000 });
  await expect(thread.locator("#hl-thread-quote")).toContainText(quote);
});

test("replying in a highlight's thread posts the reply into the thread", async ({ page }) => {
  await page.goto(POST_PATH);
  await waitReady(page);
  const { mark } = await makeHighlight(page);

  await mark.click();
  const thread = page.getByRole("dialog");
  await expect(thread).toBeVisible({ timeout: 10_000 });
  // Empty thread first — the reply composer reads/writes like a comment (WYSIWYG, not a textarea).
  await thread.locator(".tiptap-comment").click();
  await page.keyboard.type("this resonated");
  await thread.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(thread.getByText("this resonated")).toBeVisible({ timeout: 10_000 });
});

test("a ?hl deep link scrolls into view on a post with ZERO highlights (plain-text fallback)", async ({
  page,
}) => {
  // The reported bug: on a post carrying NO highlights, a ?hl deep link did nothing — the effect bailed
  // on the empty highlight list before ever reaching findQuoteTarget's plain-text fallback. The mock
  // post seeds an empty highlight set (mockHighlights = []) and each goto reloads it, so this is a
  // genuinely zero-highlight post; the quote must still scroll in WITHOUT any highlight to arm it.
  await page.goto(POST_PATH);
  await waitReady(page);
  const quote = await page.evaluate(() => {
    const root = document.querySelector(".prose-post")!;
    const blocks = Array.from(root.children).filter((el) => (el.textContent || "").trim().length > 24);
    const block = blocks[blocks.length - 1] as HTMLElement;
    return (block.textContent || "").trim().slice(0, 24);
  });

  await page.goto(`${POST_PATH}?hl=${encodeURIComponent(quote)}`);
  await waitReady(page);
  // Prove the premise: nothing is painted, so the scroll below can only come from the plain-text path.
  await expect(page.locator("mark.kurl-highlight")).toHaveCount(0);

  const target = page.locator(".prose-post > *", { hasText: quote }).last();
  await expect(async () => {
    const box = await target.boundingBox();
    expect(box, "the quoted block was found").not.toBeNull();
    // Scrolled up from below the fold into the viewport (0 ≤ top < viewport height).
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(900);
  }).toPass({ timeout: 10_000 });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Deleting your own highlight — the reader thread sheet is the only web surface for it (no highlights
// rail/library). A freshly-created highlight is attributed to the signed-in mock viewer (MOCK_VIEWER
// === me, id 1), so its thread exposes the owner-only delete. Tapping it closes the thread, raises the
// shared destructive confirm, and — on confirm — optimistically unpaints the <mark> (which also
// recomputes the top-highlight clusters). Backend is a hard cascade (note + replies go with it).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

test("deleting your own highlight unpaints its <mark> (create → thread → delete → gone)", async ({
  page,
}) => {
  await page.goto(POST_PATH);
  await waitReady(page);
  const { mark } = await makeHighlight(page);
  await expect(page.locator("mark.kurl-highlight")).toHaveCount(1);

  // The mark opens its thread, which — because the highlight is the viewer's own — offers delete.
  await mark.click();
  const thread = page.getByRole("dialog");
  await expect(thread).toBeVisible({ timeout: 10_000 });

  // Owner delete: closes the thread and raises the destructive confirm over the page.
  await thread.getByRole("button", { name: "Delete highlight" }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Delete", exact: true }).click();

  // Optimistic unpaint — the mark is gone from the body.
  await expect(page.locator("mark.kurl-highlight")).toHaveCount(0, { timeout: 10_000 });
});
