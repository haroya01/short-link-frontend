"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { PenSquare, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { postHref } from "@/modules/blog/components/feed-card";

// ─── Mocked stats ────────────────────────────────────────────────────────────
// These two have no backend source yet, so the dashboard hero fills them with placeholders to keep
// the design complete. Swap for real values when the backend lands (tracked task):
//   • Weekly views needs timestamped view events — today viewCount is a cumulative counter with no
//     per-view timestamps, so "this week" can't be sliced.
//   • Comment count needs a CommentRepository.countByAuthorId (author's posts' comments).
// TODO(backend): replace MOCK_VIEWS_THIS_WEEK with real weekly views once view events are tracked.
const MOCK_VIEWS_THIS_WEEK = 128;
// TODO(backend): replace MOCK_COMMENTS with a real author comment count.
const MOCK_COMMENTS = 2;
// ─────────────────────────────────────────────────────────────────────────────

const HERO_SECTION =
  "border-b border-slate-200/70 bg-gradient-to-b from-accent-50/50 to-white";
const HERO_INNER = "mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16";

/**
 * The feed hero adapts to who's looking. Visitors (and crawlers — this defaults to the marketing
 * hero until auth resolves) get the blog's pitch; a signed-in author gets a compact "my space"
 * dashboard — what they've shipped, what's pending, and the fastest path back to writing — so the
 * page reads as their workspace rather than a public landing.
 */
export function FeedHero({ locale }: { locale: string }) {
  const t = useTranslations("publicFeed");
  const { ready, authenticated, me } = useAuth();
  const [posts, setPosts] = useState<PostView[] | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let alive = true;
    listMyPosts()
      .then((p) => alive && setPosts(p))
      .catch(() => alive && setPosts([]));
    return () => {
      alive = false;
    };
  }, [ready, authenticated]);

  // Default surface: marketing pitch. Shown to visitors, and to authors until auth/posts resolve so
  // there's no jarring empty box (the dashboard swaps in once data arrives).
  if (!ready || !authenticated) return <MarketingHero t={t} />;
  if (posts === null) return <DashboardSkeleton />;

  let published = 0;
  let drafts = 0;
  let topPost: PostView | null = null;
  for (const p of posts) {
    if (p.status === "PUBLISHED") {
      published++;
      if (!topPost || p.viewCount > topPost.viewCount) topPost = p;
    } else if (p.status === "DRAFT") {
      drafts++;
    }
  }

  const username = me?.username ?? null;
  const name = username || me?.email?.split("@")[0] || t("heroEyebrow");

  return (
    <section className={HERO_SECTION}>
      <div className={HERO_INNER}>
        <div className="hero-stagger max-w-2xl">
          <h1
            className="text-balance text-[28px] font-semibold leading-[1.15] tracking-headline text-slate-900 sm:text-[34px]"
            style={{ ["--hi" as string]: 0 } as CSSProperties}
          >
            {t("heroWelcome", { name })}
          </h1>
          <p
            className="mt-2 flex items-center gap-1.5 text-[15px] leading-relaxed text-slate-500"
            style={{ ["--hi" as string]: 1 } as CSSProperties}
          >
            <TrendingUp aria-hidden className="h-4 w-4 text-accent-600" />
            {t("heroWeeklyViews", { count: MOCK_VIEWS_THIS_WEEK })}
          </p>

          <dl
            className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px]"
            style={{ ["--hi" as string]: 2 } as CSSProperties}
          >
            <Stat label={t("statPublished")} value={published} />
            <Stat label={t("statDrafts")} value={drafts} />
            <Stat label={t("statComments")} value={MOCK_COMMENTS} />
          </dl>

          {topPost && (
            <p
              className="mt-3 truncate text-[14px] text-slate-500"
              style={{ ["--hi" as string]: 3 } as CSSProperties}
            >
              <span className="text-slate-400">{t("statTopPost")}</span>{" "}
              {username ? (
                <a
                  href={postHref(username, topPost.slug, locale)}
                  className="font-medium text-slate-700 underline-offset-2 hover:text-accent-700 hover:underline"
                >
                  {topPost.title}
                </a>
              ) : (
                <span className="font-medium text-slate-700">{topPost.title}</span>
              )}
            </p>
          )}

          <div
            className="mt-6 flex flex-wrap gap-2.5"
            style={{ ["--hi" as string]: 4 } as CSSProperties}
          >
            <a
              href={blogHref("/write/new")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(5,150,105,0.45)] transition-colors hover:bg-accent-700"
            >
              <PenSquare className="h-4 w-4" />
              {t("write")}
            </a>
            <a
              href={blogHref("/posts")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {t("viewDashboard")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-[16px] font-bold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function MarketingHero({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <section className={HERO_SECTION}>
      <div className={HERO_INNER}>
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
  );
}

// Same shell + rhythm as the dashboard hero so swapping real data in causes no layout shift.
function DashboardSkeleton() {
  return (
    <section className={HERO_SECTION}>
      <div className={HERO_INNER}>
        <div className="max-w-2xl animate-pulse">
          <div className="h-8 w-72 rounded bg-slate-200/80" />
          <div className="mt-3 h-4 w-56 rounded bg-slate-200/70" />
          <div className="mt-6 flex gap-6">
            <div className="h-5 w-20 rounded bg-slate-200/70" />
            <div className="h-5 w-16 rounded bg-slate-200/70" />
            <div className="h-5 w-20 rounded bg-slate-200/70" />
          </div>
          <div className="mt-6 flex gap-2.5">
            <div className="h-10 w-28 rounded-lg bg-slate-200/80" />
            <div className="h-10 w-32 rounded-lg bg-slate-200/60" />
          </div>
        </div>
      </div>
    </section>
  );
}
