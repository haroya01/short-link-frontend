"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { blogHref } from "@/lib/host";

/**
 * Global blog search — the single search entry point, in the header so it's reachable from every
 * blog surface (feed home, post, tags, author) rather than trapped in one page's body. A compact 🔍
 * that expands on click to keep the header's right cluster uncrowded. Submitting soft-navigates to
 * the feed's `?q=` view (server-rendered results), velog-style. Reads the current query from the URL
 * on mount to prefill — deliberately not via useSearchParams, so mounting this in the shared header
 * doesn't opt every blog page out of static rendering.
 */
export function BlogHeaderSearch({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const t = useTranslations("publicFeed");
  const router = useRouter();
  // On the discovery hub (feed home) the field rests open so search reads as a primary action, not a
  // utility hidden behind a glyph; deep pages (post/tags/author) keep the compact 🔍 that expands on
  // click. A live `?q=` also forces it open regardless.
  const [open, setOpen] = useState(defaultOpen);
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

  // Soft-navigate when the target stays on this origin (dev /blog-preview path, or prod's same blog
  // host) so the view swaps in without a full reload; only a genuine cross-origin hop hard-navigates.
  function navigate(href: string) {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) {
      router.push(url.pathname + url.search);
    } else {
      window.location.href = href;
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      setOpen(false);
      return;
    }
    navigate(blogHref(`/?q=${encodeURIComponent(q)}`));
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
          // Keep the field open on the hub even when empty; elsewhere an empty blur collapses it.
          if (!value.trim() && !defaultOpen) setOpen(false);
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
            // If results are showing (?q= in the URL), clearing should exit them — not just blank
            // the box, which would otherwise strand the user in stale results with no way back.
            if (new URLSearchParams(window.location.search).get("q")) {
              navigate(blogHref("/"));
            }
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
