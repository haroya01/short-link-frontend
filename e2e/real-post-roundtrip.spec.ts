import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { readerShape } from "./helpers/reader-shape";

type Block = { type: string; content: string | null };
type Post = { slug: string; blocks: Block[] };

const CORPUS: Post[] = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/post-corpus.json"), "utf8"));
const POST_ID = 16;
const IMPORT_BROKEN_CODE_FENCES = new Set(["java-6", "java-8", "java-enum", "jpa", "nginx-htpasswd"]);

test.describe("real posts survive opening and saving in the web editor", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const post of CORPUS) {
    test(post.slug, async ({ page }) => {
      test.skip(IMPORT_BROKEN_CODE_FENCES.has(post.slug), "imported with code fences split across paragraphs — pending a data repair");
      let saved: Block[] | null = null;
      await page.route("**/api/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
      await page.route("**/api/v1/users/me", (r) =>
        r.fulfill({ json: { id: 1, email: "e@kurl.test", role: "USER", createdAt: "2026-05-29T00:00:00Z", username: "author" } }),
      );
      await page.route(`**/api/v1/posts/${POST_ID}`, (r) =>
        r.fulfill({
          json: {
            id: POST_ID, slug: post.slug, title: post.slug, status: "PUBLISHED", languageTag: "ko",
            publishedAt: "2026-05-29T00:00:00Z", scheduledAt: null, excerpt: null, ogImageUrl: null, viewCount: 0,
            tags: ["kurl"], seriesId: null, seriesOrder: null, createdAt: "2026-05-29T00:00:00Z", updatedAt: "2026-05-29T00:00:00Z",
          },
        }),
      );
      await page.route(`**/api/v1/posts/${POST_ID}/blocks`, (r) => {
        if (r.request().method() === "PUT") saved = r.request().postDataJSON()?.blocks ?? [];
        return r.fulfill({ json: post.blocks.map((b, i) => ({ id: i + 1, ...b, blockOrder: i })) });
      });
      await page.context().addInitScript(() => {
        localStorage.setItem("short-link:access-token", "e2e-fake-token");
        localStorage.setItem("kurl:cookie-consent:v1", "accepted");
      });
      await page.goto(`/en/blog/write/${POST_ID}`);
      await expect(page.locator(".tiptap")).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(() => saved, { timeout: 30_000 }).not.toBeNull();

      expect(await readerShape(saved as Block[]), `${post.slug}: the reader shows something different after just opening and saving`).toEqual(
        await readerShape(post.blocks),
      );
    });
  }
});
