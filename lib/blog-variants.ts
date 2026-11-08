const AUTHOR_HOME = /^\/[a-z]{2}\/p\/[^/]+\/?$/;
const TAG_FEED = /^\/[a-z]{2}\/blog\/tags\/[^/]+\/?$/;

// The bare author home and tag feed are cached pages; a query that changes what they render moves
// to a per-request sibling route. `tag_filter` holds an underscore so no post slug can shadow it.
export function routeAuthorTagVariant(url: URL): boolean {
  if (!AUTHOR_HOME.test(url.pathname) || !url.searchParams.get("tag")?.trim()) return false;
  url.pathname = `${url.pathname.replace(/\/$/, "")}/tag_filter`;
  return true;
}

export function routeTagFeedVariant(url: URL): boolean {
  if (!TAG_FEED.test(url.pathname)) return false;
  if (!["sort", "view"].some((k) => url.searchParams.has(k))) return false;
  url.pathname = `${url.pathname.replace(/\/$/, "")}/browse`;
  return true;
}
