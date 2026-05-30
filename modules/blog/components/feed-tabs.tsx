import { getTranslations } from "next-intl/server";
import { blogHref } from "@/lib/host";

type TabKey = "recent" | "trending" | "following";

/**
 * Feed section tabs (최신 · 인기 · 팔로잉) that link to the feed home — used on sub-pages (a tag's
 * feed, the topics index) so the user can hop laterally into any feed mode and the top chrome stays
 * the same across surfaces, instead of a one-way "back" link. `active` is null on sub-pages (a tag
 * isn't one of the three feed modes); the feed home renders its own search-aware tab bar.
 */
export async function FeedTabs({
  locale,
  active = null,
}: {
  locale: string;
  active?: TabKey | null;
}) {
  const t = await getTranslations({ locale, namespace: "publicFeed" });
  const tabs: { key: TabKey; label: string }[] = [
    { key: "recent", label: t("recent") },
    { key: "trending", label: t("trending") },
    { key: "following", label: t("feed") },
  ];
  return (
    <nav className="flex gap-1 text-[15px] font-bold">
      {tabs.map((tab) => (
        <a
          key={tab.key}
          href={blogHref(`/?sort=${tab.key}`)}
          aria-current={active === tab.key ? "page" : undefined}
          className={`relative rounded px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
            active === tab.key
              ? "text-accent-700 after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent-600"
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
