import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Heart, PenSquare } from "lucide-react";
import {
  listPublicFeed,
  type FeedSort,
  type PublicFeedItem,
} from "@/modules/blog/api/public-posts";

export const revalidate = 30;

const DATE_LOCALE: Record<string, string> = { ko: "ko-KR", ja: "ja-JP", en: "en-US" };
const KURL_HOST = process.env.NEXT_PUBLIC_KURL_HOST;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: `blog.kurl — ${t("title")}` };
}

function postHref(username: string, slug: string, locale: string): string {
  return KURL_HOST
    ? `https://${username}.${KURL_HOST}/${slug}`
    : `/${locale}/p/${username}/${slug}`;
}

export default async function BlogFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { locale } = await params;
  const { sort: sortParam } = await searchParams;
  const sort: FeedSort = sortParam === "trending" ? "trending" : "recent";
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  const result = await listPublicFeed(sort, 0, 24);
  const items = result.ok ? result.data.items : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <nav className="flex gap-1 text-[15px] font-semibold">
          <SortTab label={t("recent")} href="?sort=recent" active={sort === "recent"} />
          <SortTab label={t("trending")} href="?sort=trending" active={sort === "trending"} />
        </nav>
        <a
          href="/write"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
        >
          <PenSquare className="h-4 w-4" />
          {t("write")}
        </a>
      </header>

      <div className="section-divider my-8" />

      {items.length === 0 ? (
        <p className="text-slate-400">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <FeedCard
              key={`${item.author.username}/${item.slug}`}
              item={item}
              locale={locale}
              t={t}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function SortTab({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`rounded-md px-3 py-1.5 transition-colors ${
        active ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {label}
    </a>
  );
}

function FeedCard({
  item,
  locale,
  t,
}: {
  item: PublicFeedItem;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const href = postHref(item.author.username, item.slug, locale);
  return (
    <li>
      <a
        href={href}
        className="group -mx-4 flex items-start gap-5 rounded-2xl px-4 py-5 transition-colors hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px] text-slate-500">
            {item.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.author.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-700">
                {item.author.username.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate">@{item.author.username}</span>
          </div>
          <h2 className="mt-1.5 text-[19px] font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-accent-700">
            {item.title}
          </h2>
          {item.excerpt && (
            <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-slate-500">
              {item.excerpt}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-slate-400">
            <time dateTime={item.publishedAt}>
              {new Date(item.publishedAt).toLocaleDateString(DATE_LOCALE[locale] ?? "ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span>·</span>
            <span>{t("views", { count: item.viewCount })}</span>
            {item.likeCount > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Heart className="h-3 w-3" />
                {item.likeCount}
              </span>
            )}
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
        {item.ogImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.ogImageUrl}
            alt=""
            className="hidden h-20 w-28 shrink-0 rounded-xl object-cover sm:block"
            loading="lazy"
          />
        )}
      </a>
    </li>
  );
}
