import type { Metadata } from "next";
import { AuthorHome, authorHomeMetadata } from "../_components/author-home";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return authorHomeMetadata(username);
}

export default async function AuthorTagFilterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { locale, username } = await params;
  const { tag } = await searchParams;
  return <AuthorHome locale={locale} username={username} rawTag={tag} />;
}
