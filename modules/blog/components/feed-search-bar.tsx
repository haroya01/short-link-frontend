"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

/**
 * Prominent search for the feed home — the discovery hub, where finding a post/tag/author is a
 * primary action and earns a full-width field above the tabs. Deep pages (post, tags, author) keep
 * the compact header 🔍 instead. Submitting soft-navigates to the feed's `?q=` view, which renders
 * results server-side, so this only owns the input and the navigation.
 */
export function FeedSearchBar({ defaultQuery = "" }: { defaultQuery?: string }) {
  const t = useTranslations("publicFeed");
  const router = useRouter();
  const [value, setValue] = useState(defaultQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    // Relative push keeps it on the feed route and just swaps the query (same idiom as the tabs);
    // an empty submit clears back to the default feed.
    router.push(q ? `?q=${encodeURIComponent(q)}` : "?");
  }

  return (
    <form onSubmit={submit} role="search" className="relative max-w-2xl">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-11 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 transition-[box-shadow,border-color] focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label={t("searchClear")}
          className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
