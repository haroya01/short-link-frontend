import { Link2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { linksHref } from "@/lib/host";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { authorHref } from "@/modules/blog/components/feed-card";
import { FollowButton } from "@/modules/blog/components/follow-button";

type Tab = "posts" | "series" | "about";

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
  const tabs: { key: Tab; href: string; label: string }[] = [
    { key: "posts", href: authorHref(author.username, locale), label: t("tabPosts") },
    { key: "series", href: authorHref(author.username, locale, "series"), label: t("tabSeries") },
    { key: "about", href: authorHref(author.username, locale, "about"), label: t("tabAbout") },
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

      <nav className="mt-8 flex gap-1 border-b border-slate-200 text-[15px] font-medium dark:border-slate-800">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 transition-colors ${
              active === tab.key
                ? "border-accent-600 text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
