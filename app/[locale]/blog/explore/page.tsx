import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ExploreScreen } from "@/modules/blog/components/explore-screen";

const BLOG_URL =
  process.env.NEXT_PUBLIC_BLOG_URL ??
  (process.env.NEXT_PUBLIC_BLOG_HOST
    ? `https://${process.env.NEXT_PUBLIC_BLOG_HOST}`
    : "https://blog.kurl.me");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const title = `${t("exploreTitle")} · kurl log`;
  const url = `${BLOG_URL}/${locale}/explore`;
  return {
    title,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `${BLOG_URL}/${l}/explore`])),
        "x-default": `${BLOG_URL}/${routing.defaultLocale}/explore`,
      },
    },
    openGraph: { title, url, type: "website", siteName: "kurl log" },
  };
}

export default async function ExplorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 sm:px-6 sm:py-8">
      <Suspense>
        <ExploreScreen />
      </Suspense>
    </div>
  );
}
