import { getTranslations } from "next-intl/server";
import type { PublicAuthor } from "@/modules/blog/api/public-posts";
import { FollowButton } from "@/modules/blog/components/follow-button";

type Tab = "posts" | "series" | "about";

/**
 * Shared header for the author's blog pages (velog @user style): avatar + handle + bio, then a
 * tab bar — 글 / 시리즈 / 소개. Hrefs are relative to the author subdomain root.
 */
export async function AuthorHeader({ author, active }: { author: PublicAuthor; active: Tab }) {
  const t = await getTranslations("publicPost");
  const tabs: { key: Tab; href: string; label: string }[] = [
    { key: "posts", href: "/", label: t("tabPosts") },
    { key: "series", href: "/series", label: t("tabSeries") },
    { key: "about", href: "/about", label: t("tabAbout") },
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
          <h1 className="text-headline-sm font-semibold tracking-headline text-slate-900 sm:text-headline-md">
            @{author.username}
          </h1>
          {author.bio && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{author.bio}</p>
          )}
          <div className="mt-4">
            <FollowButton username={author.username} initialFollowerCount={0} />
          </div>
        </div>
      </div>

      <nav className="mt-8 flex gap-1 border-b border-slate-200 text-[15px] font-medium">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={tab.href}
            aria-current={active === tab.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 transition-colors ${
              active === tab.key
                ? "border-accent-600 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
