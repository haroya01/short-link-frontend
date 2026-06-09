"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  FEED_TABS,
  getFeedPrefs,
  setDefaultTab,
  writeFeedTabCookie,
  type FeedTab,
} from "@/modules/blog/api/feed-prefs";

/**
 * Default feed-tab picker for blog settings — which tab opens when you land on the blog home. Loads
 * the account pref, mirrors it to the SSR cookie, and on change persists (account) + rewrites the
 * cookie so the next home load opens there with no flash. Rows mirror the language selector's pattern.
 */
const TAB_LABEL_KEY: Record<FeedTab, string> = {
  recent: "recent",
  trending: "trending",
  following: "feed",
  series: "seriesTab",
};

export function FeedDefaultTabSetting({ rowClass }: { rowClass: string }) {
  const t = useTranslations("blogWorkspace");
  const tFeed = useTranslations("publicFeed");
  const [tab, setTab] = useState<FeedTab | null>(null);

  useEffect(() => {
    let alive = true;
    getFeedPrefs()
      .then((p) => {
        if (!alive) return;
        setTab(p.defaultTab);
        writeFeedTabCookie(p.defaultTab); // keep the SSR cookie in sync with the account
      })
      .catch(() => alive && setTab("recent"));
    return () => {
      alive = false;
    };
  }, []);

  function choose(next: FeedTab) {
    if (next === tab) return;
    setTab(next); // optimistic
    writeFeedTabCookie(next);
    setDefaultTab(next).catch(() => {}); // best-effort; cookie already reflects the choice
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t("settingsFeed")}</h2>
      <div className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
        <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {t("settingsDefaultTab")}
        </p>
        {FEED_TABS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => choose(opt)}
            aria-pressed={tab === opt}
            disabled={tab === null}
            className={cn(rowClass, "w-full", tab === opt && "text-accent-700 dark:text-accent-300")}
          >
            {tFeed(TAB_LABEL_KEY[opt])}
            {tab === opt && <Check className="h-4 w-4 text-accent-600 dark:text-accent-400" />}
          </button>
        ))}
      </div>
    </section>
  );
}
