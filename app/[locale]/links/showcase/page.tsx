import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShowcaseLanding } from "@/modules/profile/components/showcase";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "showcase" });
  // Title keyword anchored to "link in bio" / "프로필 페이지" — the brand-style hero copy
  // ("내가 원하는 스타일대로") doesn't carry organic search intent on its own. The on-page H1
  // still uses the editorial line; only the meta surface targets keywords.
  const title = t("meta.title");
  const description = t("meta.description");
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${locale}/showcase` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/showcase`,
      type: "website",
      siteName: "kurl",
      images: [
        {
          url: `${SITE_URL}/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/${locale}/opengraph-image`],
    },
  };
}

export default async function ShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "showcase" });
  // CollectionPage JSON-LD — explicitly classifies the page as a curated gallery of example
  // profiles. Helps Google differentiate this marketing surface from the dynamic /u/{handle}
  // pages (Person + ProfilePage). Drives "link in bio examples" / "프로필 페이지 사례"
  // queries toward this URL instead of a random user page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("meta.title"),
    description: t("meta.description"),
    url: `${SITE_URL}/${locale}/showcase`,
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "kurl", url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ShowcaseLanding />
    </>
  );
}
