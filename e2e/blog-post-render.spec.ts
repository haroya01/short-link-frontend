import { test, expect } from "@playwright/test";

/**
 * Reader-side rendering — what a VISITOR actually sees on a published post. This is the gap the
 * authoring specs can't reach: blog-write-flow asserts the block PAYLOAD the editor saves, never how
 * the reader renders it (the bold-feedback regression slipped through exactly because nothing checked
 * lived output). The public post page is a Server Component that fetches its data server-side, which
 * Playwright cannot intercept — so this suite runs in MOCK-ON (NEXT_PUBLIC_USE_MOCKS=1), where the
 * in-memory mock serves a deterministic post whose body covers every block type.
 *
 * Runs in CI via the e2e-mock-on lane (a mock-ON build), separate from the mock-OFF authoring lane.
 */
test.use({ viewport: { width: 1280, height: 900 } });

// A seeded mock post (see modules/blog/api/_mocks.ts → SEEDS / sampleBlocks). Its body has a
// PARAGRAPH, H2s, a bulleted list, a TS code block, a blockquote, an image, and a GFM table.
const POST_PATH = "/en/p/dohyun/nextjs-14-app-router-blog";

test("a published post renders every block type for the reader", async ({ page }) => {
  await page.goto(POST_PATH);
  const article = page.locator(".prose-post");
  await expect(article).toBeVisible({ timeout: 30_000 });

  // Headings, list, blockquote, image, table, and the code block (with its real code text) must all
  // render as their semantic elements — a renderer regression for any block type fails loudly here.
  await expect(article.locator("h2").first()).toBeVisible();
  await expect(article.locator("ul li").first()).toBeVisible();
  await expect(article.locator("blockquote").first()).toBeVisible();
  await expect(article.locator("img").first()).toBeVisible();
  await expect(article.locator("table td").first()).toBeVisible();
  await expect(article.locator("pre").first()).toBeVisible();
  await expect(article).toContainText("function add");
});

test("reader typography is applied — heading is larger and bolder than body text", async ({ page }) => {
  // Guards the .prose-post editorial typography (the same class of bug as the missing .tiptap strong
  // rule): assert computed styles, not just element presence.
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  const m = await page.evaluate(() => {
    const px = (el: Element | null) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
    const wt = (el: Element | null) => (el ? Number(getComputedStyle(el).fontWeight) : 0);
    const h2 = document.querySelector(".prose-post h2");
    const p = document.querySelector(".prose-post p");
    return { h2Size: px(h2), pSize: px(p), h2Weight: wt(h2) };
  });
  expect(m.h2Size).toBeGreaterThan(m.pSize);
  expect(m.h2Weight).toBeGreaterThanOrEqual(600);
});

test("a soft line break renders as a tight <br> — narrower than a real paragraph break", async ({
  page,
}) => {
  // The editor's single-Enter soft break stores `\` + newline inside ONE PARAGRAPH block. The reader
  // must render it as a <br> (NO literal backslash, NOT a second paragraph), and the gap between the
  // two soft-broken lines must be narrower than the gap across a real paragraph boundary. This is the
  // lived counterpart to the authoring spec's structural check — proven with computed line geometry.
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });

  const m = await page.evaluate(() => {
    const ps = [...document.querySelectorAll(".prose-post p")];
    const sp = ps.find((p) => (p.textContent || "").includes("소프트 줄바꿈 첫 줄"));
    const np = ps.find((p) => (p.textContent || "").includes("작업을 하며 부딪힌"));
    if (!sp || !np) return { found: false } as const;
    const lineTops = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      // Drop zero-size rects — a <br> emits a width:0 rect at the FIRST line's top, which would
      // otherwise read as a second "line" sharing line 1's top and zero out the advance.
      const tops = [...r.getClientRects()]
        .filter((c) => c.width > 0 && c.height > 0)
        .map((c) => Math.round(c.top));
      return [...new Set(tops)].sort((a, b) => a - b);
    };
    const spTops = lineTops(sp);
    const npTops = lineTops(np);
    // Top-to-top advance between two soft-broken lines vs. across the paragraph boundary (last line
    // of the soft-break paragraph → first line of the next paragraph). Apples-to-apples line advances.
    const withinAdvance = spTops.length >= 2 ? spTops[1] - spTops[0] : 0;
    const acrossAdvance = npTops[0] - spTops[spTops.length - 1];
    return {
      found: true,
      brs: sp.querySelectorAll("br").length,
      paragraphs: ps.filter((p) => (p.textContent || "").includes("소프트 줄바꿈")).length,
      text: sp.textContent || "",
      lines: spTops.length,
      withinAdvance,
      acrossAdvance,
    } as const;
  });

  expect(m.found, "the soft-break paragraph is present").toBe(true);
  if (!m.found) return;
  expect(m.brs, "the soft break renders as exactly one <br>").toBe(1);
  expect(m.paragraphs, "the soft break stays in ONE paragraph, not split into two").toBe(1);
  expect(m.text).toContain("소프트 줄바꿈 첫 줄");
  expect(m.text).toContain("같은 문단의 둘째 줄");
  expect(m.text, "no literal backslash leaks into the rendered text").not.toContain("\\");
  expect(m.lines, "the paragraph occupies two visual lines").toBeGreaterThanOrEqual(2);
  expect(m.withinAdvance).toBeGreaterThan(0);
  // The headline guarantee: a real paragraph break is wider than a soft line break.
  expect(
    m.acrossAdvance,
    "a real paragraph break must be wider than a soft line break",
  ).toBeGreaterThan(m.withinAdvance);
});

test("a series post shows the series banner (progress + episode list) and an end-of-post next-up card", async ({
  page,
}) => {
  // The seeded mock post (POST_PATH) is part 1 of the "Next.js 깊게 파기" series, so the on-post series
  // UI renders for the reader: a top banner (title + progress stepper + collapsible episode list with
  // the current part marked) and a bottom "next in this series" continuation card.
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });

  const banner = page.locator("nav").filter({ hasText: "Next.js 깊게 파기" }).first();
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: /In this series/i }).click();
  // The current part is marked in the expanded episode list (not just listed).
  await expect(banner.locator('[aria-current="true"]')).toBeVisible();

  // End-of-post continuation: the next part card + a link to the whole series.
  await expect(page.getByText("Next in this series", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /View all 3 parts/i })).toBeVisible();
});

test("a comment's @author handle links to the commenter's profile", async ({ page }) => {
  // The comment author (avatar + @handle) must be a link to their profile (cross-host on prod), not
  // plain text — so readers can jump from a comment to who wrote it.
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  const authorLink = page.locator('a[href*="/p/minji"]').first(); // seeded mock comment by @minji
  await expect(authorLink).toBeVisible();
  await expect(authorLink).toContainText("minji");
});

test("the comment composer is WYSIWYG — a rich editor, not a raw-markdown textarea + preview pane", async ({
  page,
}) => {
  // The regression this guards: the comment box used to be a <textarea> where you typed raw markdown
  // (`**bold**`) with a SEPARATE live "Preview" pane below. It's now a contenteditable WYSIWYG — the
  // input itself shows the formatting, no markers, no second pane. (A whole writing surface can sit
  // un-migrated while build/typecheck stay green — only driving the UI catches that.)
  await page.goto(POST_PATH);
  const comments = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: /comment/i }) });
  await expect(comments).toBeVisible({ timeout: 30_000 });

  // The input is a contenteditable rich editor, not a <textarea>, and the duplicate "Preview" pane is gone.
  const editor = comments.locator('[contenteditable="true"].tiptap-comment').first();
  await expect(editor).toBeVisible();
  await expect(comments.locator("textarea")).toHaveCount(0);
  await expect(comments.getByText("Preview", { exact: true })).toHaveCount(0);

  // Proof it's WYSIWYG: the Bold tool makes the next typing render as a real <strong>, NOT `**text**`.
  await editor.click();
  await comments.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type("loud");
  await expect(editor.locator("strong")).toHaveText("loud");
  await expect(editor).not.toContainText("**");
});

test("the highlight-note composer is WYSIWYG too — selecting text → Note opens a rich editor, not a textarea", async ({
  page,
}) => {
  // The surface that slipped the first pass: leaving a highlight NOTE was its own <textarea>, separate
  // from the comment composer. mock-on seeds a session token → the reader is authenticated, so Note
  // opens the sheet (no Google redirect).
  await page.goto(POST_PATH);
  await expect(page.locator(".prose-post")).toBeVisible({ timeout: 30_000 });
  // The comment composer mounting proves the comments client island hydrated; a short settle then lets
  // the in-memory mock /me resolve so the reader is authenticated (Note opens the sheet, not a redirect).
  // (networkidle never fires here — the page keeps a live connection open.)
  await expect(page.locator(".tiptap-comment").first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);

  // Select a run of text inside a direct-child block of .prose-post and finalize on mouseup — exactly
  // what the highlight action bar listens for (readSelection requires a non-collapsed in-prose range).
  await page.evaluate(() => {
    const root = document.querySelector(".prose-post")!;
    const block = Array.from(root.children).find(
      (el) => (el.textContent || "").trim().length > 20,
    ) as HTMLElement;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let textNode: Node | null = null;
    while (walker.nextNode()) {
      if ((walker.currentNode.textContent || "").trim().length >= 8) {
        textNode = walker.currentNode;
        break;
      }
    }
    const node = textNode ?? block.firstChild!;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(8, (node.textContent || "").length));
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });

  // The selection action bar appears → tap Note.
  const bar = page.getByRole("toolbar");
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "Note" }).click();

  // The note sheet is the SAME WYSIWYG editor — contenteditable, and crucially NOT a <textarea>.
  const sheet = page.getByRole("dialog", { name: "Add a note" });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[contenteditable="true"].tiptap-comment')).toBeVisible();
  await expect(sheet.locator("textarea")).toHaveCount(0);
});

test("feed → post is a client-side navigation (so loading skeletons show, no freeze-then-pop)", async ({
  page,
}) => {
  // Blog links are BlogLink → Next <Link>, so an in-app nav is a SOFT navigation: the route's
  // loading.tsx skeleton streams in instantly instead of the browser holding the old page until the
  // new document is ready. Proof: the JS context survives the click (a full reload would reset it).
  await page.goto("/en/blog");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => ((window as Window & { __nav?: string }).__nav = "alive"));
  // :visible — the browse feed renders a mobile list tree AND the md+ masonry (CSS-only breakpoint
  // split); the same post link exists in both, and DOM-order .first() would grab the hidden one.
  const post = page.locator('a[href$="/nextjs-14-app-router-blog"]:visible').first();
  await expect(post).toBeVisible({ timeout: 15_000 });
  await post.click();
  await page.waitForURL(/\/p\/[^/]+\/nextjs-14-app-router-blog/, { timeout: 15_000 });
  expect(
    await page.evaluate(() => (window as Window & { __nav?: string }).__nav),
    "the JS context survived → soft (client) navigation, not a full reload",
  ).toBe("alive");
});
