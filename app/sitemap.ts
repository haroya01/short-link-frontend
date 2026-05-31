import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { SEO_PAGES } from "@/modules/marketing/seo-landing";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? SITE_URL;

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
