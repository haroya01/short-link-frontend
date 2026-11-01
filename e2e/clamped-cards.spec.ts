import { expect, test } from "@playwright/test";
import { mockBackend } from "./helpers/mock-backend";

test.use({ viewport: { width: 390, height: 844 } });

const LONG =
  "Why do our grids show a brief spike in electricity demand every minute? A team found that regular checks by battery storage systems are the cause. ".repeat(
    4,
  );

const note = {
  id: 900,
  body: "읽어 볼 만한 기사",
  createdAt: "2026-11-01T09:00:00Z",
  editedAt: null,
  likeCount: 0,
  likedByMe: false,
  author: { id: 7, username: "yuna", avatarUrl: null, displayName: null, remoteId: null },
  media: [],
  quotedPost: null,
  inReplyToId: null,
  replyCount: 0,
  repostCount: 0,
  repostedByMe: false,
  quotedNote: null,
  linkPreview: { url: "https://news.example/grid", title: LONG, description: LONG, image: null },
  visibility: "public",
};

test("a link card keeps its title and its description to two lines each", async ({ page }) => {
  await mockBackend(page, {
    "GET /api/v1/public/home": (route) => route.fulfill({ json: { items: [{ kind: "note", note }], next: null } }),
  });
  await page.goto("/ko/blog");
  const card = page.locator('article[data-note-id="900"] [data-note-link-card]');
  await expect(card).toBeVisible({ timeout: 30_000 });
  const lines = await card
    .locator(".line-clamp-2")
    .evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
    );
  expect(lines).toHaveLength(2);
  for (const count of lines) expect(count).toBeLessThanOrEqual(2.05);
});
