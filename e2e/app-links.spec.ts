import { expect, test } from "@playwright/test";

const FILE = "/.well-known/apple-app-site-association";
const BLOG_HOST = { "x-original-host": "blog.kurl.me" };

interface Component {
  "/": string;
  "?"?: Record<string, string>;
  exclude?: boolean;
}

test("the association file answers as JSON with no redirect, behind the blog host too", async ({ request }) => {
  for (const headers of [{}, BLOG_HOST]) {
    const res = await request.get(FILE, { headers, maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/json");

    const { applinks } = await res.json();
    expect(applinks.details).toHaveLength(1);
    expect(applinks.details[0].appIDs).toEqual(["5R78H9H4YU.focustime.kurl"]);

    const components: Component[] = applinks.details[0].components;
    const at = (path: string, exclude: boolean) =>
      components.findIndex((c) => c["/"] === path && !!c.exclude === exclude && !c["?"]);
    for (const prefix of ["", "/en", "/ko", "/ja", "/vi", "/hi"]) {
      for (const taken of ["/rooms/join/?*", "/@?*", "/@*/?*", "/@*/notes/?*", "/@*/series/?*"]) {
        expect(at(`${prefix}${taken}`, false), `${prefix}${taken}`).toBeGreaterThanOrEqual(0);
      }
      for (const page of ["about", "bookmarks", "feed", "liked", "opengraph-image", "tag_filter"]) {
        expect(at(`${prefix}/@*/${page}`, true), `${prefix}/@*/${page}`).toBeGreaterThanOrEqual(0);
        expect(at(`${prefix}/@*/${page}`, true), `${prefix}/@*/${page}`).toBeLessThan(at(`${prefix}/@*/?*`, false));
      }
      for (const tab of ["notes", "replies", "media", "reposts", "series", "collections"]) {
        expect(at(`${prefix}/@*/${tab}`, true), `${prefix}/@*/${tab}`).toBe(-1);
      }
      expect(at(`${prefix}/@*/notes/*/*`, true)).toBeLessThan(at(`${prefix}/@*/notes/?*`, false));
      expect(at(`${prefix}/@*/series/*/*`, true)).toBeLessThan(at(`${prefix}/@*/series/?*`, false));
      expect(at(`${prefix}/@*/series/?*`, false)).toBeLessThan(at(`${prefix}/@*/*/*`, true));
      const preview = components.findIndex((c) => c["/"] === `${prefix}/@*/?*` && c.exclude && c["?"]?.preview === "?*");
      expect(preview).toBeGreaterThanOrEqual(0);
      expect(preview).toBeLessThan(at(`${prefix}/@*/?*`, false));
    }
  }
});

test("each address the app takes is a real page on the blog host", async ({ page }) => {
  await page.setExtraHTTPHeaders(BLOG_HOST);
  const title = page.getByRole("heading", { level: 1 });

  await page.goto("/rooms/join/hike");
  await expect(page.getByTestId("room-join").getByRole("heading", { level: 1 })).toHaveText("주말 등산 모임", { timeout: 30_000 });

  await page.goto("/@dohyun");
  await expect(title).toHaveText("dohyun");

  await page.goto("/@dohyun/nextjs-14-app-router-blog");
  await expect(title).toHaveText("Next.js 14 App Router로 블로그를 다시 만든 이유");

  await page.goto("/@dohyun/media");
  await expect(title).toHaveText("dohyun");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveAttribute("href", /\/media$/);

  await page.goto("/en/@dohyun/notes/72");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('[data-note-id="72"]').first()).toBeVisible();

  await page.goto("/ja/@dohyun/series/nextjs-deep-dive");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(title).toHaveText("Next.js 깊게 파기");
});
