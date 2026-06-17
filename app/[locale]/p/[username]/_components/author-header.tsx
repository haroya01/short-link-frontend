import { Link2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cardHref } from "@/lib/host";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { Avatar } from "@/modules/blog/components/avatar";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { FollowCounts } from "@/modules/blog/components/follow-counts";
import { AuthorTabs } from "./author-tabs";

type Tab = "posts" | "series" | "collections" | "about";

/**
 * Shared header for the author's blog pages (velog @user style): avatar + handle + bio, then a
 * tab bar — 글 / 시리즈 / 소개. Hrefs are relative to the author subdomain root.
 */
export async function AuthorHeader({ author }: { author: PublicAuthor }) {
  const t = await getTranslations("publicPost");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  // Full author-base paths (not bare "/series") so the tabs work on the path-based deployment
  // (kurl.me/{locale}/p/{user}) as well as the author subdomain. The profile is the author's PUBLIC
  // surface; the viewer's own private reading list (좋아요 / 북마크) lives in the workspace
  // (/blog/curation), reachable from the account menu — not as owner-only tabs on a public page.
  const tabs: { key: Tab; href: string; label: string }[] = [
    { key: "posts", href: authorHref(author.username, locale), label: t("tabPosts") },
    { key: "series", href: authorHref(author.username, locale, "series"), label: t("tabSeries") },
    {
      key: "collections",
      href: authorHref(author.username, locale, "collections"),
      label: t("tabCollections"),
    },
    { key: "about", href: authorHref(author.username, locale, "about"), label: t("tabAbout") },
  ];

  return (
    <header>
      {/* Identity block. Rides the calm root crossfade on a tab switch (NOT its own view-transition
          group) — under that crossfade the OLD page is held at full opacity, so the identical avatar /
          handle / bio stay visually static instead of dipping. (A named group did the opposite: it
          crossfaded old-out/new-in, and the new snapshot is pre-hydration, so the whole block blinked.) */}
      <div className="flex items-start gap-5">
        <Avatar src={author.avatarUrl} name={author.username} size="xl" />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            @{author.username}
          </h1>
          {author.bio && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{author.bio}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <FollowButton username={author.username} initialFollowerCount={0} showCount={false} />
            {/* Tappable follower / following counts — each opens the list at the matching tab. */}
            <FollowCounts username={author.username} />
            {/* Cross-surface link to the same person's link-in-bio (separate product, shared
                identity). Shown only when they actually have one. */}
            {author.hasLinkInBio && (
              <a
                href={cardHref(author.username, locale)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
              >
                <Link2 className="h-3.5 w-3.5" />
                {tNav("profile")}
              </a>
            )}
          </div>
        </div>
      </div>

      <AuthorTabs tabs={tabs} username={author.username} />
    </header>
  );
}
