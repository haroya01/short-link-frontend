import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { ReportButton } from "@/components/blog/report-button";
import { ShareButton } from "@/components/blog/share-button";
import { ViewBeacon } from "@/components/blog/view-beacon";
import { PostToc } from "@/components/blog/post-toc";
import { ArticleBody, extractHeadings, readingMinutes } from "../_components/post-blocks";
import { findPublicPost } from "@/lib/api/public-posts";

export const revalidate = 30;

type ReadonlyHeaders = Awaited<ReturnType<typeof headers>>;

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };

function subdomainOrigin(req: ReadonlyHeaders, username: string): string {
  const host = req.get("x-original-host") ?? req.get("host");
  if (!host) return `https://${username}.kurl.me`;
  const cleaned = host.split(":")[0];
  return `https://${cleaned}`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const result = await findPublicPost(username, slug);
  if (!result.ok) return { title: `@${username}` };
  const { author, post } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `${origin}/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      url: `${origin}/${post.slug}`,
      type: "article",
      siteName: `@${author.username}`,
      images: post.ogImageUrl ? [{ url: post.ogImageUrl }] : undefined,
      locale: post.languageTag,
    },
  };
}

export default async function PublicPostPage({
  params,
}: {
  params: Promise<{ locale: string; username: string; slug: string }>;
}) {
  const { locale, username, slug } = await params;
  const result = await findPublicPost(username, slug);
  const t = await getTranslations({ locale, namespace: "publicPost" });

  if (!result.ok) {
    // backend: UNPUBLISHED → 410, DRAFT/SCHEDULED/missing → 404.
    if (result.status === 410) return <GonePage username={username} t={t} />;
    notFound();
  }

  const { author, post, blocks } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  const postUrl = `${origin}/${post.slug}`;
  const minutes = readingMinutes(blocks);
  const headings = extractHeadings(blocks);

  return (
    <div className="relative mx-auto max-w-6xl">
      {headings.length >= 2 && (
        <aside className="absolute right-0 top-20 hidden w-56 xl:block">
          <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto">
            <PostToc headings={headings} />
          </div>
        </aside>
      )}
      <article className="mx-auto max-w-2xl px-6 py-14 sm:py-20" lang={post.languageTag}>
        <ViewBeacon username={username} slug={slug} />

      <header className="mb-12">
        <h1 className="text-headline-sm font-bold tracking-tight text-slate-900 sm:text-headline-md">
          {post.title}
        </h1>
        <div className="mt-6 flex items-center justify-between gap-4">
          <a href="/" className="group flex min-w-0 items-center gap-3">
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt={`@${author.username}`}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">
                {author.username.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-accent-700">
                @{author.username}
              </span>
              <span className="block text-[13px] text-slate-400">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                {" · "}
                {t("readingTime", { minutes })}
              </span>
            </span>
          </a>
          <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
        </div>
      </header>

      <ArticleBody blocks={blocks} />

      <footer className="mt-20 border-t border-slate-100 pt-8">
        <div className="flex items-center justify-between gap-4">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-accent-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("morePosts", { username: author.username })}
          </a>
          <div className="flex items-center gap-4">
            <ShareButton postUrl={postUrl} postSlug={post.slug} postTitle={post.title} />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <ReportButton subjectType="POST" subjectId={post.id} />
        </div>
      </footer>
      </article>
    </div>
  );
}

function GonePage({
  username,
  t,
}: {
  username: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 py-28 text-center">
      <h1 className="text-headline-sm font-bold tracking-tight text-slate-900">{t("goneTitle")}</h1>
      <p className="mt-3 text-slate-500">{t("goneBody")}</p>
      <a
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("morePosts", { username })}
      </a>
    </main>
  );
}
