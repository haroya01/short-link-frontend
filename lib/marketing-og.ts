import type { Metadata } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

const OG_LOCALE: Record<string, string> = { ko: "ko_KR", ja: "ja_JP", en: "en_US" };

/**
 * Shared og/twitter block for kurl.me marketing pages (pricing, learn, about, legal, …).
 *
 * Next merges metadata SHALLOWLY per top-level key: a page that declares its own `openGraph`
 * (or none at all, next to a layout that does) ends up replacing the root layout's whole og
 * object — so pages that set only title/description silently shipped with the ROOT's og:title
 * and url, and pages adding any og field lost og:image and unfurled blank on Discord/Slack/
 * Kakao. Marketing pages route through here instead of re-declaring the boilerplate; the image
 * is the locale's generated brand card (app/[locale]/opengraph-image).
 */
export function marketingOg({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: string;
  title: string;
  description?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const url = `${SITE_URL}/${locale}${path}`;
  const image = `${SITE_URL}/${locale}/opengraph-image`;
  return {
    openGraph: {
      type: "website",
      url,
      siteName: "kurl",
      title,
      description,
      locale: OG_LOCALE[locale] ?? "en_US",
      images: [{ url: image, width: 2400, height: 1260, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
