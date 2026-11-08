import type { Metadata } from "next";
import { TagFeed, tagFeedMetadata } from "./_components/tag-feed";

// ?sort= · ?view= 는 middleware 가 ./browse 로 보낸다 — 이 페이지는 기본 보기만 캐시한다.
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}): Promise<Metadata> {
  const { locale, tag } = await params;
  return tagFeedMetadata(locale, tag);
}

export default async function TagFeedPage({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}) {
  const { locale, tag } = await params;
  return <TagFeed locale={locale} tag={tag} />;
}
