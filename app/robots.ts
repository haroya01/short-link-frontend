import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/dashboard",
          "/*/dashboard",
          "/admin",
          "/*/admin",
          "/settings",
          "/*/settings",
          "/stats/",
          "/*/stats/",
          "/auth/",
          "/*/auth/",
          "/api/",
          // Auth surfaces have no informational value as search entry points and crowd brand
          // sitelinks. Also noindex'd at the page layer (defense-in-depth) so a missed crawl
          // rule still keeps them out of the index.
          "/login",
          "/*/login",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
