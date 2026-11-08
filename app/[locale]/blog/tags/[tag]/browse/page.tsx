import type { Metadata } from "next";
import { TagFeed, tagFeedMetadata } from "../_components/tag-feed";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}): Promise<Metadata> {
  const { locale, tag } = await params;
  return tagFeedMetadata(locale, tag);
}

export default async function TagFeedBrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tag: string }>;
  searchParams: Promise<{ sort?: string; view?: string }>;
}) {
  const { locale, tag } = await params;
  const { sort, view } = await searchParams;
  return <TagFeed locale={locale} tag={tag} sortParam={sort} viewParam={view} />;
}
