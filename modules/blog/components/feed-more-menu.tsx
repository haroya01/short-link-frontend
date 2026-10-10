"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils";

export type FeedMoreItem = {
  key: string;
  label: string;
  href: string;
  active?: boolean;
  external?: boolean;
};

export function FeedMoreMenu({ items, label }: { items: FeedMoreItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const current = items.find((item) => item.active);
  const inPlace = items.filter((item) => !item.external);
  const pages = items.filter((item) => item.external);

  const itemClass = (item: FeedMoreItem) =>
    cn(
      "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800",
      item.active ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-200",
    );

  return (
    <div ref={root} className="relative" data-feed-more>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "focus-ring touch-target inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
          current
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            : "border border-slate-200 text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100",
        )}
      >
        {current?.label ?? label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200 ease-[var(--ease)] motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-48 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {inPlace.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              role="menuitem"
              aria-current={item.active ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={itemClass(item)}
            >
              {item.label}
            </Link>
          ))}
          {inPlace.length > 0 && pages.length > 0 && (
            <div role="separator" className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          )}
          {pages.map((item) => (
            <a key={item.key} href={item.href} role="menuitem" className={itemClass(item)}>
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
