import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { SEO_PAGES } from "@/modules/marketing/seo-landing";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? SITE_URL;

// Blog lives on its own host (blog.kurl.me); each author's public surface is blog.kurl.me/@{username},
// velog-style. All of it sits under one Search Console *Domain* property (kurl.me), so a single sitemap
// may list the cross-host URLs. Post/author canonicals are host-root (no locale prefix) — match exactly.
const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";
const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL ??
  (process.env.NEXT_PUBLIC_BLOG_HOST
    ? `https://${process.env.NEXT_PUBLIC_BLOG_HOST}`
    : `https://blog.${PLATFORM_DOMAIN}`);

// Marketing surfaces we actively push for organic search. Order doesn't matter for indexing
// but priority below differentiates importance signals to crawlers. /login is intentionally
// absent — auth pages have no informational value as search entry points and were dominating
// brand-name sitelinks. robots.ts disallows it and the page-level layout sets noindex.
const PUBLIC_PATHS = [
  "",
  "/qr-campaigns",
  "/showcase",
  "/learn",
  "/about",
  "/pricing",
  "/terms",
  "/privacy",
] as const;

// Sitemap priority is a weak signal but consistent differentiation helps Google decide which
// pages deserve sitelink slots and which are leaf content. Push targets get 0.9-1.0; informational
// long-tail gets 0.7; trust pages (terms/privacy) stay low so they don't crowd brand sitelinks.
function priorityFor(path: string): number {
  if (path === "" || path === "/qr-campaigns") return 1.0;
  if (path === "/showcase") return 0.9;
  if (path === "/learn") return 0.7;
  if (path === "/about" || path === "/pricing") return 0.5;
  return 0.3;
}

function changeFrequencyFor(path: string): "weekly" | "monthly" {
  if (path === "" || path === "/qr-campaigns" || path === "/showcase") return "weekly";
  return "monthly";
}

// Cap profile entries inserted into the sitemap. 5000 is the per-sitemap-file limit Google
// recommends; if we ever exceed it we'd switch to a sitemap index. The backend listing endpoint
// caps each fetch at 1000, so we make at most 5 requests at build/revalidate time.
const PROFILE_SITEMAP_CAP = 5000;
const PROFILE_PAGE_SIZE = 1000;

type ProfileListResponse = {
  items: { username: string }[];
  total: number;
};

// Enumerate every public blog post for the sitemap. The feed endpoint is paged + ordered recent;
// we walk until hasNext is false (or the cap). Same graceful-degradation rule as profiles: a backend
// hiccup returns what we have rather than deindexing the whole site.
const POST_SITEMAP_CAP = 20000;
const POST_PAGE_SIZE = 100;

type FeedPostItem = { author: { username: string }; slug: string; publishedAt: string | null };
type FeedPageResponse = { items: FeedPostItem[]; hasNext: boolean };

async function fetchPublicPosts(): Promise<FeedPostItem[]> {
  const posts: FeedPostItem[] = [];
  for (let page = 0; posts.length < POST_SITEMAP_CAP; page++) {
    const url = `${API_BASE}/api/v1/public/posts?sort=recent&page=${page}&size=${POST_PAGE_SIZE}`;
    let data: FeedPageResponse;
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) break;
      data = (await res.json()) as FeedPageResponse;
    } catch {
      break;
    }
    if (!data.items?.length) break;
    posts.push(...data.items);
    if (!data.hasNext) break;
  }
  return posts;
}

async function fetchPublicProfiles(): Promise<string[]> {
  const handles: string[] = [];
  for (let page = 0; page * PROFILE_PAGE_SIZE < PROFILE_SITEMAP_CAP; page++) {
    const url = `${API_BASE}/api/v1/public/profiles?page=${page}&size=${PROFILE_PAGE_SIZE}`;
    let data: ProfileListResponse;
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) break;
      data = (await res.json()) as ProfileListResponse;
    } catch {
      // Failing the entire sitemap because of a transient backend hiccup would deindex the site
      // — return whatever we collected so far instead.
      break;
    }
    handles.push(...data.items.map((i) => i.username));
    if (data.items.length < PROFILE_PAGE_SIZE) break;
  }
  return handles;
}

// Popular tags back the topic feeds (blog.kurl.me/{locale}/tags/{tag}). These pages already emit
// canonical + OG + hreflang but were absent from the sitemap, so crawlers only reached them via
// chip-click. Cap to the most-used tags — the long tail is covered by the posts that carry them.
const TAG_SITEMAP_CAP = 200;
type TagCountResponse = { tag: string; count: number };

async function fetchPopularTags(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/tags?limit=${TAG_SITEMAP_CAP}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as TagCountResponse[];
    return data.map((t) => t.tag).filter(Boolean);
  } catch {
    // Same graceful-degradation rule as posts/profiles — a backend hiccup drops the tag block, not
    // the whole sitemap.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PUBLIC_PATHS) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency: changeFrequencyFor(path),
        priority: priorityFor(path),
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`]),
          ),
        },
      });
    }
  }

  // Programmatic SEO landing pages (one per high-intent query) — active organic-search push targets.
  for (const page of SEO_PAGES) {
    const path = `/use/${page.slug}`;
    for (const locale of routing.locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
        },
      });
    }
  }

  // Blog feed home (blog.kurl.me) per locale — the discovery entry point for all posts.
  for (const locale of routing.locales) {
    entries.push({
      url: `${BLOG_URL}/${locale}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}`])),
      },
    });
  }

  // Topic index + popular topic feeds (blog.kurl.me/{locale}/tags[/{tag}]) — the taxonomy surface.
  for (const locale of routing.locales) {
    entries.push({
      url: `${BLOG_URL}/${locale}/tags`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}/tags`])),
      },
    });
  }
  const tags = await fetchPopularTags();
  for (const tag of tags) {
    const enc = encodeURIComponent(tag);
    // One entry at the default locale carrying the full hreflang set — keeps the per-tag block bounded
    // (cap × 1) instead of cap × locales while still declaring every language variant.
    entries.push({
      url: `${BLOG_URL}/${routing.defaultLocale}/tags/${enc}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}/tags/${enc}`])),
      },
    });
  }

  // Blog posts + their author homes. The canonical shape is blog.kurl.me/@{username}[/{slug}] — the
  // {username}.kurl.me subdomain was re-purposed to the link-in-bio 명함 (middleware rewrites it), so a
  // subdomain post URL 404s. Mirror the post page's own canonical (authorBaseUrl → BLOG_URL/@{user}).
  // No locale prefix — author surfaces are host-root, single-language. Dedupe author homes across posts.
  const posts = await fetchPublicPosts();
  const authorHomes = new Set<string>();
  for (const post of posts) {
    if (!post.author?.username || !post.slug) continue;
    const authorBase = `${BLOG_URL}/@${post.author.username}`;
    authorHomes.add(authorBase);
    entries.push({
      url: `${authorBase}/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  for (const authorBase of authorHomes) {
    entries.push({
      url: `${authorBase}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
    // Author's series index — host-root like the home (no locale prefix). The series-detail pages
    // carry CollectionPage JSON-LD and are reached by crawl from here; the index is the entry point.
    entries.push({
      url: `${authorBase}/series`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  const handles = await fetchPublicProfiles();
  for (const username of handles) {
    entries.push({
      url: `${SITE_URL}/${routing.defaultLocale}/u/${username}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${SITE_URL}/${l}/u/${username}`]),
        ),
      },
    });
  }

  // Showcase demo pages — fixture profiles rendered at /showcase/<handle>. Lower priority than
  // real user profiles so search results favor actual users, but indexed so the marketing pages
  // can pull SEO weight too.
  for (const profile of SHOWCASE_PROFILES) {
    entries.push({
      url: `${SITE_URL}/${routing.defaultLocale}/showcase/${profile.username}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${SITE_URL}/${l}/showcase/${profile.username}`]),
        ),
      },
    });
  }

  return entries;
}
