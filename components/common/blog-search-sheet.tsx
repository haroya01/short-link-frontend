"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { blogHref } from "@/lib/host";

/**
 * Full-screen mobile search, opened from the bottom-nav 검색 tab. The desktop header keeps its own
 * inline search; this is the touch-first counterpart so the field gets the whole width and auto-focus
 * instead of cramming into a 390px top bar. Submits to the feed's `?q=` view (same as the header).
 */
export function BlogSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("publicFeed");
  const tc = useTranslations("common");
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(new URLSearchParams(window.location.search).get("q")?.trim() ?? "");
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  function navigate(href: string) {
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin) router.push(url.pathname + url.search);
    else window.location.href = href;
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    onClose();
    if (q) navigate(blogHref(`/?q=${encodeURIComponent(q)}`));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("searchLabel")}
      className="fixed inset-0 z-50 bg-white sm:hidden"
    >
      <form onSubmit={submit} role="search" className="flex h-14 items-center gap-2 px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("close")}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/30 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      </form>
    </div>
  );
}
