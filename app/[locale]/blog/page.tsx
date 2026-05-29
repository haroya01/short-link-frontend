import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PenSquare } from "lucide-react";
import { blogHref } from "@/lib/host";
import { listPublicFeed, type FeedSort } from "@/modules/blog/api/public-posts";
import { FeedCard, FeedGrid } from "@/modules/blog/components/feed-card";
import { FeedEmpty } from "@/modules/blog/components/feed-empty";
import { FollowingFeed } from "@/modules/blog/components/following-feed";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: `blog.kurl — ${t("title")}` };
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
  // "following" is client-rendered (auth needed); recent/trending are server-fetched here.
  const tab: "recent" | "trending" | "following" =
    sortParam === "trending" || sortParam === "following" ? sortParam : "recent";
  const t = await getTranslations({ locale, namespace: "publicFeed" });

  const result = tab === "following" ? null : await listPublicFeed(tab as FeedSort, 0, 24);
  const items = result && result.ok ? result.data.items : [];

  const writeCta = (
    <a
      href={blogHref("/write/new")}
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
    >
      <PenSquare className="h-4 w-4" />
      {t("write")}
    </a>
  );

  return (
    <>
      {/* Identity hero — same restrained eyebrow / headline / subhead treatment as the showcase &
          landing heroes, so blog.kurl reads as part of kurl rather than a bare tab bar on white. */}
      <section className="border-b border-slate-200/70 bg-gradient-to-b from-accent-50/50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="hero-stagger max-w-2xl space-y-3">
            <p
              className="font-mono text-[11px] uppercase tracking-tagline text-accent-700"
              style={{ ["--hi" as string]: 0 } as CSSProperties}
            >
              {t("heroEyebrow")}
            </p>
            <h1
              className="text-balance text-[30px] font-semibold leading-[1.1] tracking-headline text-slate-900 sm:text-[40px]"
              style={{ ["--hi" as string]: 1 } as CSSProperties}
            >
              {t("heroTitle")}
            </h1>
            <p
              className="max-w-md text-balance text-[15px] leading-relaxed text-slate-500"
              style={{ ["--hi" as string]: 2 } as CSSProperties}
            >
              {t("heroSubhead")}
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
          <nav className="flex gap-1 text-[15px] font-bold">
            <SortTab label={t("recent")} href="?sort=recent" active={tab === "recent"} />
            <SortTab label={t("trending")} href="?sort=trending" active={tab === "trending"} />
            <SortTab label={t("feed")} href="?sort=following" active={tab === "following"} />
            <SortTab label={t("topics")} href={blogHref("/tags")} active={false} />
          </nav>
          <div className="hidden sm:block">{writeCta}</div>
        </header>

        {tab === "following" ? (
          <FollowingFeed locale={locale} />
        ) : items.length === 0 ? (
          <FeedEmpty title={t("emptyTitle")} body={t("emptyBody")} action={writeCta} />
        ) : (
          <div className="mt-8">
            <FeedGrid>
              {items.map((item) => (
                <FeedCard
                  key={`${item.author.username}/${item.slug}`}
                  item={item}
                  locale={locale}
                  labels={{ views: (count) => t("views", { count }) }}
                />
              ))}
            </FeedGrid>
          </div>
        )}
      </main>

      {/* Mobile-only floating write button — the header Write CTA is desktop-only (sm:block), so
          on phones the action lives here as a FAB (velog-style). */}
      <a
        href={blogHref("/write/new")}
        aria-label={t("write")}
        className="fixed bottom-6 right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-600 text-white shadow-[0_8px_24px_-6px_rgba(5,150,105,0.5)] transition-colors hover:bg-accent-700 sm:hidden"
      >
        <PenSquare className="h-5 w-5" />
      </a>
    </>
  );
}

function SortTab({ label, href, active }: { label: string; href: string; active: boolean }) {
  // next/link → client-side soft navigation between tabs (no full reload / flicker).
  return (
    <Link
      href={href}
      className={`relative px-2.5 py-1.5 transition-colors ${
        active
          ? "text-accent-700 after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent-600"
          : "text-slate-400 hover:text-slate-700"
      }`}
    >
      {label}
    </Link>
  );
}
