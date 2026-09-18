import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export default function robots(): MetadataRoute.Robots {
  // Match workspace routes at their actual root/locale prefixes. A wildcard like
  // /*/write also matches /@author/write-better (and /tags/write), hiding public content.
  const privatePaths = [
    "/dashboard",
    "/admin",
    "/settings",
    "/stats/",
    "/auth/",
    "/login",
    "/write",
    "/drafts",
    "/analytics",
    "/notifications",
    "/curation",
    "/leads",
    "/webhooks",
  ];
  const prefixes = [
    "",
    ...routing.locales.flatMap((locale) => [
      `/${locale}`,
      `/${locale}/blog`,
      `/${locale}/links`,
    ]),
  ];
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          ...prefixes.flatMap((prefix) => privatePaths.map((path) => `${prefix}${path}`)),
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
