"use client";

import { Link2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { linksHref } from "@/lib/host";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { authorPath } from "@/modules/blog/components/feed-card";
import { FeedSortTabs } from "@/modules/blog/components/feed-sort-tabs";
import { FollowButton } from "@/modules/blog/components/follow-button";

const norm = (p: string) => p.replace(/\/+$/, "") || "/";

/**
 * Persistent author header (avatar · bio · follow + 글/시리즈/소개 tabs), rendered once by the author
 * layout so it stays mounted across tab navigation. The tab bar is the feed home's {@link FeedSortTabs}
 * — same gliding, distance-proportional underline — and the tabs soft-navigate (relative {@link
 * authorPath}) so the layout/header don't reload. The active tab is the one whose path matches the
 * current URL exactly (works on both the subdomain and the /p path deployment).
 */
export function AuthorProfileHeader({ author, locale }: { author: PublicAuthor; locale: string }) {
  const t = useTranslations("publicPost");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const cur = norm(pathname);

  const homePath = authorPath(author.username, locale);
  const seriesPath = authorPath(author.username, locale, "series");
  const aboutPath = authorPath(author.username, locale, "about");

  const tabs = [
    { key: "posts", label: t("tabPosts"), href: homePath, active: cur === norm(homePath) },
    { key: "series", label: t("tabSeries"), href: seriesPath, active: cur === norm(seriesPath) },
    { key: "about", label: t("tabAbout"), href: aboutPath, active: cur === norm(aboutPath) },
  ];

  return (
    <header>
      <div className="flex items-start gap-5">
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
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            @{author.username}
          </h1>
          {author.bio && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{author.bio}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <FollowButton username={author.username} initialFollowerCount={0} />
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

      {/* Same baseline + gliding underline as the feed home tabs. */}
      <div className="mt-8 border-b border-slate-200 pb-3 dark:border-slate-800">
        <FeedSortTabs tabs={tabs} />
      </div>
    </header>
  );
}
