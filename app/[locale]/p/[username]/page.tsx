import type { Metadata } from "next";
import { AuthorHome, authorHomeMetadata } from "./_components/author-home";

// 30s ISR — author 발행 후 30 초 내 visitors 반영. ?tag= 필터는 middleware 가 ./tag_filter 로 보낸다.
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return authorHomeMetadata(username);
}

export default async function PublicProfileHomepage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  return <AuthorHome locale={locale} username={username} />;
}
