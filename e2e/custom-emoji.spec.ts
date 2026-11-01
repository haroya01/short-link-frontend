import { expect, test, type Page } from "@playwright/test";
import { mockBackend } from "./helpers/mock-backend";

const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const ZWSP = String.fromCharCode(0x200b);
const EMOJI = "https://emoji.remote.test";

const remoteNote = {
  id: 910,
  body: `Halloween :aramaki_halloween_mummy:${ZWSP} and :blobcat: and :lantern:${ZWSP} https://remote.test/:aramaki_halloween_mummy: #aramaki_halloween_mummy`,
  createdAt: "2026-10-31T09:00:00Z",
  editedAt: null,
  likeCount: null,
  likedByMe: false,
  author: {
    id: -9810,
    username: "aramaki@mastodon.remote.test",
    avatarUrl: null,
    displayName: "Aramaki :neoghost:",
    remoteId: 9810,
    url: "https://mastodon.remote.test/@aramaki",
    emojis: [{ shortcode: "neoghost", url: `${EMOJI}/neoghost.png` }],
  },
  media: [],
  quotedPost: null,
  inReplyToId: null,
  replyCount: 0,
  repostCount: null,
  repostedByMe: false,
  quotedNote: null,
  linkPreview: null,
  visibility: "public",
  emojis: [
    { shortcode: "aramaki_halloween_mummy", url: `${EMOJI}/mummy.png` },
    { shortcode: "lantern", url: `${EMOJI}/lantern.png` },
  ],
};

async function serve(page: Page) {
  await page.route(`${EMOJI}/**`, (route) =>
    route.request().url().endsWith("/lantern.png")
      ? route.fulfill({ status: 404, body: "" })
      : route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }),
  );
  await mockBackend(page, {
    "GET /api/v1/public/home": (route) =>
      route.fulfill({ json: { items: [{ kind: "note", note: remoteNote }], next: null } }),
  });
}

test("a remote note draws the emojis it lists, keeps the rest as text, and falls back to the name when a picture breaks", async ({
  page,
}) => {
  await serve(page);
  await page.goto("/ko/blog");
  const card = page.locator('article[data-note-id="910"]');
  const body = card.locator("[data-note-body] p");

  const mummy = body.getByRole("img", { name: ":aramaki_halloween_mummy:" });
  await expect(mummy).toBeVisible({ timeout: 30_000 });
  await expect(mummy).toHaveAttribute("title", ":aramaki_halloween_mummy:");
  await expect.poll(() => mummy.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  const box = (await mummy.boundingBox())!;
  expect(box.height).toBeGreaterThan(15);
  expect(box.height).toBeLessThan(22);

  await expect(body.locator("img")).toHaveCount(1);
  await expect(body).toContainText(":blobcat:");
  await expect(body).toContainText(":lantern:");
  await expect(body.getByRole("link", { name: "https://remote.test/:aramaki_halloween_mummy" })).toBeVisible();
  await expect(body.getByRole("link", { name: "#aramaki_halloween_mummy" })).toBeVisible();
  expect(await body.textContent()).not.toContain(ZWSP);

  await expect(card.locator("header").getByRole("img", { name: ":neoghost:" })).toBeVisible();
  await expect(card.locator("header")).toContainText("Aramaki");
});
