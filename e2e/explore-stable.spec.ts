import { expect, test, type Page, type Route } from "@playwright/test";
import { mockFeedView, mockSuggestedAuthors } from "../modules/blog/api/_mocks";
import { mockBackend } from "./helpers/mock-backend";
import { remoteTrendingItem } from "./helpers/remote-notes";

test.use({ viewport: { width: 412, height: 823 } });

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => (open = resolve));
  return { opened, open };
}

async function serveExplore(page: Page, { posts, authors }: { posts: Promise<void>; authors: Promise<void> }) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await mockBackend(page, {
    "GET /api/v1/federation/trending": (route: Route) =>
      route.fulfill({ json: { items: Array.from({ length: 5 }, (_, i) => remoteTrendingItem(i)), next: null } }),
    "GET /api/v1/public/posts": async (route: Route) => {
      await posts;
      await route.fulfill({ json: mockFeedView({ sort: "trending", viewer: false }) });
    },
    "GET /api/v1/public/authors": async (route: Route) => {
      await authors;
      await route.fulfill({ json: mockSuggestedAuthors(5, false) });
    },
  });
}

const cls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);

test("other servers' picks wait under the lane until the lane's own posts arrive", async ({ page }) => {
  const posts = gate();
  await serveExplore(page, { posts: posts.opened, authors: Promise.resolve() });
  await page.goto("/ko/blog/explore");
  const picks = page.getByTestId("explore-picks");
  await expect(picks.locator("[data-remote-uri]")).toHaveCount(0);
  await page.waitForTimeout(400);
  await expect(picks.locator("[data-remote-uri]")).toHaveCount(0);

  posts.open();
  await expect(picks.locator("[data-post-id]").first()).toBeVisible();
  await expect(picks.locator("[data-remote-uri]").first()).toBeAttached();
});

test("the people strip holds its height while suggestions load", async ({ page }) => {
  const authors = gate();
  await serveExplore(page, { posts: Promise.resolve(), authors: authors.opened });
  await page.goto("/ko/blog/explore");
  const skeleton = page.getByTestId("explore-people-strip-skeleton");
  await expect(skeleton).toBeVisible();
  const held = (await skeleton.boundingBox())!.height;

  authors.open();
  const strip = page.getByTestId("explore-people-strip");
  await expect(strip).toBeVisible();
  await expect(skeleton).toHaveCount(0);
  expect(Math.abs((await strip.boundingBox())!.height - held)).toBeLessThanOrEqual(1);
});

test("the server sends the search bar, lane tabs and lane skeleton, not an empty page", async ({ request }) => {
  const html = await (await request.get("/ko/blog/explore")).text();
  expect(html).toContain('role="search"');
  expect(html).toContain('id="explore-lane-picks"');
  expect(html).toContain('data-testid="explore-picks"');
});

test("explore does not shift when other servers answer before the lane's posts and authors", async ({ page }) => {
  const posts = gate();
  const authors = gate();
  await serveExplore(page, { posts: posts.opened, authors: authors.opened });
  await page.goto("/ko/blog/explore");
  await page.waitForTimeout(500);
  authors.open();
  await page.waitForTimeout(300);
  posts.open();
  await expect(page.getByTestId("explore-picks").locator("[data-post-id]").first()).toBeVisible();
  await expect(page.getByTestId("explore-people-strip")).toBeVisible();
  await page.waitForTimeout(800);
  expect(await cls(page)).toBeLessThan(0.05);
});
