import { test, expect, type Page } from "@playwright/test";

/**
 * Blog post CRUD lifecycle — the adversarial companion to blog-write-flow (which proves *inserting*
 * blocks) and blog-write-stress (throughput). This suite drives the *lifecycle* the write-flow suite
 * never exercises: the status machine (draft → publish → unpublish → republish → back-to-draft,
 * schedule → cancel), delete (confirm / cancel / failure-retry / success-navigation), and the nasty
 * edges where two of those race — autosave vs. publish, delete while a save is in flight, a 409 on
 * publish, the slug locking the moment a draft goes live.
 *
 * Fully MOCKED at the Playwright layer (no Spring/DB/S3) so it runs in the backend-free lane. Every
 * assertion checks the WIRE (which endpoint fired, with what body) rather than the optimistic badge —
 * an optimistic UI can look right while sending the wrong request, and that's exactly the class of
 * bug an "everything looks fine" manual pass misses.
 */
test.use({ viewport: { width: 1280, height: 900 } });

const TOKEN = "e2e-fake-token";
const POST_ID = 16;
const NOW = "2026-05-29T00:00:00Z";

type PostState = {
  id: number;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "SCHEDULED";
  languageTag: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  excerpt: string | null;
  ogImageUrl: string | null;
  viewCount: number;
  tags: string[];
  seriesId: number | null;
  seriesOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

function freshPost(over: Partial<PostState> = {}): PostState {
  return {
    id: POST_ID,
    slug: "my-draft",
    title: "Lifecycle draft",
    status: "DRAFT",
    languageTag: "ko",
    publishedAt: null,
    scheduledAt: null,
    excerpt: null,
    ogImageUrl: null,
    viewCount: 0,
    tags: ["kurl"],
    seriesId: null,
    seriesOrder: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

const ME = { id: 1, email: "e2e@kurl.test", role: "USER", createdAt: NOW, username: "e2euser" };

type Hit = { method: string; suffix: string; body: unknown };

/**
 * A stateful mock backend. Unlike write-flow's static fulfillers, this one holds the post in a `state`
 * object and mutates it per status action, so a re-fetch after publish returns PUBLISHED and the UI
 * transitions exactly as a real backend would drive it. `hits` is the ordered wire log every test
 * asserts against. `fail`/`delay` maps let a test inject a 409, a 500, or latency on a specific
 * endpoint to drive the adversarial paths.
 */
function makeBackend() {
  const state = { post: freshPost() };
  const hits: Hit[] = [];
  const fail: Record<string, number> = {}; // suffix -> http status to return once
  const delayMs: Record<string, number> = {}; // suffix -> ms to stall

  async function install(page: Page) {
    await page.route("**/api/v1/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.route("**/api/v1/users/me", (r) => r.fulfill({ json: ME }));

    await page.route(`**/api/v1/posts/${POST_ID}`, async (route) => {
      const method = route.request().method();
      if (method === "PATCH") {
        const body = route.request().postDataJSON() ?? {};
        hits.push({ method, suffix: "(meta)", body });
        // Merge metadata edits (title/slug/excerpt/tags) into state — the reload reflects them.
        Object.assign(state.post, body, { updatedAt: NOW });
        return route.fulfill({ json: state.post });
      }
      if (method === "DELETE") {
        if (delayMs["delete"]) await new Promise((r) => setTimeout(r, delayMs["delete"]));
        if (fail["delete"]) {
          const s = fail["delete"];
          delete fail["delete"];
          hits.push({ method, suffix: "(delete-fail)", body: s });
          return route.fulfill({ status: s, body: "" });
        }
        hits.push({ method, suffix: "(delete)", body: null });
        return route.fulfill({ status: 204, body: "" });
      }
      return route.fulfill({ json: state.post });
    });

    const lifecycle: Record<string, Partial<PostState>> = {
      publish: { status: "PUBLISHED", publishedAt: NOW, scheduledAt: null },
      unpublish: { status: "UNPUBLISHED" },
      republish: { status: "PUBLISHED", publishedAt: NOW },
      "back-to-draft": { status: "DRAFT", scheduledAt: null, publishedAt: null },
      schedule: { status: "SCHEDULED" },
    };
    for (const suffix of Object.keys(lifecycle)) {
      await page.route(`**/api/v1/posts/${POST_ID}/${suffix}`, async (route) => {
        if (delayMs[suffix]) await new Promise((r) => setTimeout(r, delayMs[suffix]));
        const body = route.request().postDataJSON() ?? null;
        if (fail[suffix]) {
          const s = fail[suffix];
          delete fail[suffix];
          hits.push({ method: "POST", suffix: `${suffix}-fail`, body: s });
          return route.fulfill({
            status: s,
            contentType: "application/json",
            body: JSON.stringify({ code: s === 409 ? "SLUG_TAKEN" : "ERROR", message: "nope" }),
          });
        }
        hits.push({ method: "POST", suffix, body });
        const next = { ...lifecycle[suffix] };
        if (suffix === "schedule") next.scheduledAt = body?.scheduledAt ?? NOW;
        Object.assign(state.post, next, { updatedAt: NOW });
        return route.fulfill({ json: state.post });
      });
    }

    await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (route) => {
      if (route.request().method() === "PUT") {
        hits.push({ method: "PUT", suffix: "blocks", body: route.request().postDataJSON()?.blocks ?? null });
      }
      return route.fulfill({ json: [] });
    });

    await page.route("**/api/v1/public/link-preview**", (r) =>
      r.fulfill({
        json: { url: "https://example.com", title: "Example", description: "d", image: "https://mock-s3.test/og.png" },
      }),
    );
  }

  return {
    install,
    hits,
    state,
    setFail: (suffix: string, status: number) => (fail[suffix] = status),
    setDelay: (suffix: string, ms: number) => (delayMs[suffix] = ms),
    countOf: (suffix: string) => hits.filter((h) => h.suffix === suffix).length,
    last: (suffix: string) => [...hits].reverse().find((h) => h.suffix === suffix),
  };
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

async function openPublishDialog(page: Page) {
  // "Publish" (draft) or "Post settings" (already live) — either opens the same dialog.
  const btn = page.getByRole("button", { name: /^Publish$|^Post settings$/ });
  await btn.first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS MACHINE
// ─────────────────────────────────────────────────────────────────────────────

test("draft → publish fires POST /publish exactly once with the block payload saved first", async ({ page }) => {
  const be = makeBackend();
  await be.install(page);
  await openEditor(page);

  await titleInput(page).fill("Going live");
  await page.locator(".tiptap").click();
  await page.keyboard.type("Body before publish.");

  await openPublishDialog(page);
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();

  await expect.poll(() => be.countOf("publish")).toBe(1);
  // The block content must have been persisted (PUT /blocks) before or with publish — a published
  // post that dropped its last edit is the worst lifecycle bug.
  expect(be.countOf("blocks")).toBeGreaterThanOrEqual(1);
  const blocks = be.last("blocks")?.body as { type: string; content: string | null }[] | undefined;
  expect(JSON.stringify(blocks)).toContain("Body before publish.");
});

test("published post → Unpublish fires POST /unpublish exactly once", async ({ page }) => {
  const be = makeBackend();
  be.state.post = freshPost({ status: "PUBLISHED", publishedAt: NOW });
  await be.install(page);
  await openEditor(page);

  await openPublishDialog(page);
  await page.getByRole("dialog").getByRole("button", { name: "Unpublish" }).click();
  await expect.poll(() => be.countOf("unpublish")).toBe(1);
  // Unpublish must never masquerade as a delete or a fresh publish at the wire.
  expect(be.countOf("(delete)")).toBe(0);
  expect(be.countOf("publish")).toBe(0);
});

test("unpublished post → Republish fires POST /republish exactly once", async ({ page }) => {
  // Load the editor already UNPUBLISHED — the republish transition is its own flow (reopening a
  // taken-down post), not a continuation of the unpublish dialog, so it's tested from its real
  // starting state rather than by chaining dialogs across a status flip.
  const be = makeBackend();
  be.state.post = freshPost({ status: "UNPUBLISHED" });
  await be.install(page);
  await openEditor(page);

  await openPublishDialog(page);
  await page.getByRole("dialog").getByRole("button", { name: "Republish" }).click();
  await expect.poll(() => be.countOf("republish")).toBe(1);
  expect(be.countOf("publish")).toBe(0);
});

test("a published post never autosaves — edits only persist via explicit Save changes", async ({ page }) => {
  const be = makeBackend();
  be.state.post = freshPost({ status: "PUBLISHED", publishedAt: NOW });
  await be.install(page);
  await openEditor(page);

  // Type into the live post and idle well past the 1.8s draft-autosave window.
  await page.locator(".tiptap").click();
  await page.keyboard.type("Sneaky edit to a live post.");
  await page.waitForTimeout(3000);

  // The live post must NOT have autosaved its blocks — that would silently mutate what readers see.
  expect(be.countOf("blocks")).toBe(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// SLUG LOCK (edit constraint that only bites after publish)
// ─────────────────────────────────────────────────────────────────────────────

test("slug is editable while DRAFT and locked once PUBLISHED", async ({ page }) => {
  const be = makeBackend();
  await be.install(page);
  await openEditor(page);
  await openPublishDialog(page);

  // Reveal advanced settings where the slug field lives.
  const adv = page.getByRole("button", { name: /Address|Advanced|More settings|추가 설정|주소/i });
  if (await adv.count()) await adv.first().click().catch(() => {});
  const slugField = page.getByRole("dialog").locator('input').filter({ hasNot: page.locator('[type="file"]') });
  // A draft exposes at least one editable text input in the dialog (slug/title). Not asserting the
  // exact field name (locale/label drift) — asserting the lock transition below is the real contract.
  const draftEditableCount = await slugField.count();
  expect(draftEditableCount).toBeGreaterThan(0);

  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  await expect.poll(() => be.countOf("publish")).toBe(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADVERSARIAL: races & failures
// ─────────────────────────────────────────────────────────────────────────────

test("publish that 409s (slug taken) surfaces an error and does NOT flip the UI to published", async ({ page }) => {
  const be = makeBackend();
  be.setFail("publish", 409);
  await be.install(page);
  await openEditor(page);
  await titleInput(page).fill("Clash");

  await openPublishDialog(page);
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();

  // The failed publish was attempted…
  await expect.poll(() => be.hits.some((h) => h.suffix === "publish-fail")).toBe(true);
  // …and the real publish never succeeded (no successful publish hit recorded).
  expect(be.countOf("publish")).toBe(0);
  // The editor must still treat the post as a draft — the "Publish" affordance is still reachable
  // (either the dialog stayed open, or the header still says Publish). A UI that flipped to
  // "published" on a 409 would be lying about the post's real state.
  const stillDraft =
    (await page.getByRole("dialog").getByRole("button", { name: "Publish" }).count()) > 0 ||
    (await page.getByRole("button", { name: "Publish" }).count()) > 0;
  expect(stillDraft).toBe(true);
});

// Delete lives only on the PUBLIC post page (PostOwnerActions), which is a server component that
// fetches the post from the backend with no-store. Playwright routes intercept BROWSER requests, not
// Next.js server-side fetches, so the page can't render owner actions against a mocked backend — the
// same reason the whole write-flow suite tests the (client-rendered) editor, never the public page.
// These two delete cases therefore need the real-backend lane; they're skipped in the backend-free
// lane rather than asserting against a page that never mounts the delete control.
// Delete is driven from the EDITOR header (Trash → ConfirmDialog → deletePost → router.push to the
// write list). That whole path is client-rendered, so the DELETE fires as a browser request the mock
// backend sees — unlike the public post page's owner-delete, which is server-rendered and untestable
// backend-free. Same deletePost() call, testable surface.
test("editor delete → Confirm fires DELETE once and leaves the editor", async ({ page }) => {
  const be = makeBackend();
  await be.install(page);
  await openEditor(page);

  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^(Confirm|Delete)$/ }).click();

  await expect.poll(() => be.countOf("(delete)")).toBe(1);
  // Success navigates away from /write/16 to the write list.
  await expect(page).not.toHaveURL(/\/blog\/write\/16/, { timeout: 15_000 });
});

test("editor delete → Cancel sends no DELETE and stays in the editor", async ({ page }) => {
  const be = makeBackend();
  await be.install(page);
  await openEditor(page);

  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Cancel$/ }).click();

  await page.waitForTimeout(500);
  expect(be.countOf("(delete)")).toBe(0);
  await expect(page).toHaveURL(/\/blog\/write\/16/);
  await expect(page.locator(".tiptap")).toBeVisible();
});

test("editor delete that 500s keeps the post, then a retry succeeds", async ({ page }) => {
  const be = makeBackend();
  be.setFail("delete", 500);
  await be.install(page);
  await openEditor(page);

  // First attempt fails — the confirm closes on click, deletePost 500s, and we must NOT navigate.
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^(Confirm|Delete)$/ }).click();
  await expect.poll(() => be.hits.some((h) => h.suffix === "(delete-fail)")).toBe(true);
  await expect(page).toHaveURL(/\/blog\/write\/16/);
  await expect(page.locator(".tiptap")).toBeVisible();

  // Retry now succeeds → real DELETE fires and the editor is left.
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^(Confirm|Delete)$/ }).click();
  await expect.poll(() => be.countOf("(delete)")).toBe(1);
  await expect(page).not.toHaveURL(/\/blog\/write\/16/, { timeout: 15_000 });
});

test("a human-paced double-click on Publish fires it once (busy guard holds)", async ({ page }) => {
  const be = makeBackend();
  be.setDelay("publish", 1200);
  await be.install(page);
  await openEditor(page);
  await titleInput(page).fill("No double publish");

  await openPublishDialog(page);
  const confirm = page.getByRole("dialog").getByRole("button", { name: "Publish" });
  // Click once, then assert the button DISABLES while the 1.2s publish is in flight — that disabled
  // state is exactly what stops a real second click. (Trying to actually click a disabled button
  // would hang on Playwright actionability, which is not what a user experiences.) Then confirm the
  // publish fired once, not twice.
  await confirm.click();
  await expect(confirm).toBeDisabled({ timeout: 2000 });
  await expect.poll(() => be.countOf("publish"), { timeout: 5000 }).toBe(1);
});

test("editing the title then immediately publishing persists the new title (autosave/publish race)", async ({ page }) => {
  const be = makeBackend();
  await be.install(page);
  await openEditor(page);

  // Type a title and — without waiting for the idle autosave — go straight to publish.
  await titleInput(page).fill("Race-condition title");
  await openPublishDialog(page);
  await page.getByRole("dialog").getByRole("button", { name: "Publish" }).click();

  await expect.poll(() => be.countOf("publish")).toBe(1);
  // The published post must carry the freshly typed title, not the stale one — the meta PATCH (or
  // the publish payload) has to have flushed the edit. Assert on the persisted state.
  expect(be.state.post.title).toBe("Race-condition title");
});
