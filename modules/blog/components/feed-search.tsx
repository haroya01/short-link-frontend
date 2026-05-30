"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

const DEBOUNCE_MS = 300;

/**
 * Feed search box. Debounces typing into the `?q=` query param (server re-renders the feed page
 * with the results), keeps the active sort, and clears back to the plain feed via the ✕ button.
 * Searching from the "following" tab falls back to the recent sort — search spans every author, not
 * just followed ones.
 */
export function FeedSearch({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("publicFeed");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  // Keep the input in sync when the URL changes from outside (back/forward, tab clicks that drop q).
  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  // Latest applied query, so the debounce effect doesn't re-navigate to the URL we're already on.
  const applied = useRef(initialQuery);

  function apply(next: string) {
    const trimmed = next.trim();
    if (trimmed === applied.current) return;
    applied.current = trimmed;

    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("q", trimmed);
      if (params.get("sort") === "following") params.set("sort", "recent");
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    const id = setTimeout(() => apply(value), DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(value);
      }}
      className="relative w-full sm:max-w-[520px]"
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        // Native search clear (WebKit) is hidden so only our ✕ shows.
        className="h-11 w-full rounded-[10px] border border-slate-200 bg-white pl-10 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            apply("");
          }}
          aria-label={t("searchClear")}
          className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
