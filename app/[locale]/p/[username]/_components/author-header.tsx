import { Link2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { linksHref } from "@/lib/host";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { Avatar } from "@/modules/blog/components/avatar";
import { FollowButton } from "@/modules/blog/components/follow-button";
import { AuthorTabs } from "./author-tabs";

type Tab = "posts" | "series" | "about" | "liked" | "bookmarks";

/**
 * Shared header for the author's blog pages (velog @user style): avatar + handle + bio, then a
 * tab bar — 글 / 시리즈 / 소개. Hrefs are relative to the author subdomain root.
 */
export async function AuthorHeader({ author, active }: { author: PublicAuthor; active: Tab }) {
  const t = await getTranslations("publicPost");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();
  // Full author-base paths (not bare "/series") so the tabs work on the path-based deployment
  // (kurl.me/{locale}/p/{user}) as well as the author subdomain.
  // `private` tabs (좋아요 / 북마크) render only on the viewer's OWN profile — AuthorTabs decides that
  // client-side (auth isn't available in this server component). They sit after the public tabs so the
  // tab-direction index scheme (posts 0 · series 1 · about 2 · liked 3 · bookmarks 4) stays consistent.
  const tabs: { key: Tab; href: string; label: string; private?: boolean }[] = [
    { key: "posts", href: authorHref(author.username, locale), label: t("tabPosts") },
    { key: "series", href: authorHref(author.username, locale, "series"), label: t("tabSeries") },
    { key: "about", href: authorHref(author.username, locale, "about"), label: t("tabAbout") },
    { key: "liked", href: authorHref(author.username, locale, "liked"), label: t("tabLiked"), private: true },
    { key: "bookmarks", href: authorHref(author.username, locale, "bookmarks"), label: t("tabBookmarks"), private: true },
  ];

  return (
    <header>
      {/* The identity block is identical across 글/시리즈/소개, so name it as its own view-transition
          group — it holds perfectly still on a tab switch (like the app header) instead of being swept
          into the root crossfade, so the avatar + follow button never blink between tabs. */}
      <div className="author-vt-identity flex items-start gap-5">
        <Avatar src={author.avatarUrl} name={author.username} size="xl" />
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            @{author.username}
          </h1>
          {author.bio && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{author.bio}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <FollowButton username={author.username} initialFollowerCount={0} />
            {/* Cross-surface link to the same person's link-in-bio (separate product, shared
                identity). Shown only when they actually have one. */}
            {author.hasLinkInBio && (
              <a
                href={linksHref(`/${locale}/u/${author.username}`)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-accent-500/50 dark:hover:text-accent-400"
              >
                <Link2 className="h-3.5 w-3.5" />
                {tNav("profile")}
              </a>
            )}
          </div>
        </div>
      </div>

      <AuthorTabs tabs={tabs} activeKey={active} username={author.username} />
    </header>
  );
}
