/**
 * Links-product mock layer (NEXT_PUBLIC_USE_MOCKS=1). The blog product mocks at its own API functions
 * (modules/blog/api/_mocks.ts) and short-circuits before `request()`; the links product calls
 * `request()` directly, so this resolver answers known links GET endpoints with valid (often empty)
 * data — enough for the links app screens to render their real state instead of an "Internal Server
 * Error" data-error (which blocked them from the all-screens lived-render suite).
 *
 * Scope: the read endpoints the main app screens load (dashboard · campaigns · ctas · stats · settings).
 * Returns `undefined` for anything not mocked → the caller falls through to the real fetch. Add a case
 * here as more links screens get covered. Mostly GET; the one mutation is the publish-time shorten.
 */
let mockShortenSeq = 7000;

export function mockLinksResponse(path: string, method: string): unknown | undefined {
  const verb = (method || "GET").toUpperCase();
  const p = path.split("?")[0].replace(/\/+$/, "");

  // Shorten — the blog publish flow auto-shortens in-post links. Return a valid kurl short link so
  // the rewrite recognizes it (kurlShortCode) and the flow is exercisable without a backend.
  if (verb === "POST" && p === "/api/v1/links") {
    const host = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";
    const code = (++mockShortenSeq).toString(36).padStart(4, "0");
    return { shortCode: code, shortUrl: `https://${host}/${code}`, claimToken: null };
  }

  if (verb !== "GET") return undefined;

  switch (p) {
    // Dashboard — the viewer's links (paged) + their tags.
    case "/api/v1/links/me":
      return { items: [], nextCursor: null, hasMore: false };
    case "/api/v1/tags":
      return [];
    // Campaigns / CTAs / QR campaigns lists.
    case "/api/v1/campaigns":
      return [];
    case "/api/v1/ctas":
      return [];
    // Weekly insights (dashboard/stats summary) — zeroed but well-formed.
    case "/api/v1/users/me/insights/week":
      return { clicks: 0, links: 0, topLinks: [], byDay: [] };
    default:
      return undefined;
  }
}
