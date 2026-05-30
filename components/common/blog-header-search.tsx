"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { blogHref } from "@/lib/host";

/**
 * Global blog search — lives in the header so it's reachable from every blog surface (post, tags,
 * author), not trapped in the feed body. The discovery hub (feed home) has its own prominent field,
 * so here it stays a compact 🔍 that expands on click to keep the header's right cluster uncrowded.
 * Submitting soft-navigates to the feed's `?q=` view (server-rendered results), velog-style. Reads
 * the current query from the URL on mount to prefill — deliberately not via useSearchParams, so
 * mounting this in the shared header doesn't opt every blog page out of static rendering.
 */
export function BlogHeaderSearch() {
  const t = useTranslations("publicFeed");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    if (q) {
      setValue(q);
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      setOpen(false);
      return;
    }
    const href = blogHref(`/?q=${encodeURIComponent(q)}`);
    // Soft-navigate when the target stays on this origin (dev /blog-preview path, or prod's same
    // blog host) so the results swap in without the full reload the tab links already avoid; only a
    // genuine cross-origin hop falls back to a hard navigation.
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) {
      router.push(url.pathname + url.search);
    } else {
      window.location.href = href;
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("searchLabel")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <form onSubmit={submit} role="search" className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        className="h-8 w-40 rounded-full border border-slate-200 bg-white pl-8 pr-7 text-[13px] text-slate-900 placeholder:text-slate-400 transition-[width,box-shadow] focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 sm:w-56 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          aria-label={t("searchClear")}
          className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}
