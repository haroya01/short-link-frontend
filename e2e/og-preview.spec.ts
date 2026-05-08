import { expect, test } from "@playwright/test";
import { createLink } from "./helpers/links";

test.describe("OG preview bot passthrough", () => {
  test("kakaotalk-scrap UA gets HTML with og tags", async ({ request }) => {
    const link = await createLink(request, "https://example.com/og-test");
    // Wait briefly so async OG fetch may run; even without, fallback OG should render.
    const res = await request.get(`/${link.shortCode}`, {
      headers: { "User-Agent": "kakaotalk-scrap/1.0" },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("og:title");
    expect(body).toContain("og:url");
  });

  test("regular browser UA gets 302 redirect", async ({ request }) => {
    const link = await createLink(request, "https://example.com/og-redirect");
    const res = await request.get(`/${link.shortCode}`, {
      maxRedirects: 0,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1",
      },
    });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toContain("example.com/og-redirect");
  });

  test("noindex header on redirects", async ({ request }) => {
    const link = await createLink(request, "https://example.com/noindex-test");
    const res = await request.get(`/${link.shortCode}`, { maxRedirects: 0 });
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });
});
