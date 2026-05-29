import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ReportButton } from "@/modules/blog/components/report-button";
import { listPublicPosts, type PublicPostListItem } from "@/modules/blog/api/public-posts";

// 30s ISR — author 발행 후 30 초 내 visitors 반영. Backend 가 어차피 매번 직접 조회.
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
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) return { title: `@${username}` };
  const { author } = result.data;
  const h = await headers();
  const origin = subdomainOrigin(h, username);
  return {
    title: `@${author.username}`,
    description: author.bio ?? undefined,
    alternates: { canonical: `${origin}/` },
    openGraph: {
      title: `@${author.username}`,
      description: author.bio ?? undefined,
      url: `${origin}/`,
      images: author.avatarUrl ? [{ url: author.avatarUrl }] : undefined,
    },
  };
}

export default async function PublicProfileHomepage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const result = await listPublicPosts(username);
  if (!result.ok) notFound();

  const { author, posts } = result.data;
  const t = await getTranslations({ locale, namespace: "publicPost" });

  return (
    <main className="mx-auto max-w-2xl px-6 py-14 sm:py-20">
      <header className="flex items-start gap-5">
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt={`@${author.username}`}
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-accent-100 text-2xl font-bold text-accent-700">
            {author.username.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 pt-1">
          <h1 className="text-headline-sm font-bold tracking-tight text-slate-900">
            @{author.username}
          </h1>
          {author.bio && <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{author.bio}</p>}
          <p className="mt-2 flex items-center gap-3 text-[13px] font-medium text-slate-400">
            {posts.length > 0 && <span>{t("postCount", { count: posts.length })}</span>}
            <a href="/series" className="text-accent-600 transition-colors hover:text-accent-700">
              {t("seriesIndexTitle")}
            </a>
          </p>
        </div>
      </header>

      <div className="section-divider my-12" />

      {posts.length === 0 ? (
        <p className="text-slate-400">{t("emptyPosts")}</p>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => (
            <PostListEntry key={p.slug} post={p} locale={locale} />
          ))}
        </ul>
      )}

      <footer className="mt-16 flex justify-end border-t border-slate-100 pt-8">
        <ReportButton subjectType="USER" subjectId={author.id} />
      </footer>
    </main>
  );
}

function PostListEntry({ post, locale }: { post: PublicPostListItem; locale: string }) {
  return (
    <li>
      <a
        href={`/${post.slug}`}
        className="group -mx-4 flex items-start gap-5 rounded-2xl px-4 py-5 transition-colors hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-accent-700">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-slate-500">
              {post.excerpt}
            </p>
          )}
          {post.tags.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 4).map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-medium text-slate-500 group-hover:bg-accent-50 group-hover:text-accent-700"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <time dateTime={post.publishedAt} className="mt-2.5 block text-[13px] text-slate-400">
            {formatDate(post.publishedAt, locale)}
          </time>
        </div>
        {post.ogImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.ogImageUrl}
            alt=""
            className="hidden h-20 w-28 shrink-0 rounded-xl object-cover sm:block"
            loading="lazy"
          />
        )}
      </a>
    </li>
  );
}
