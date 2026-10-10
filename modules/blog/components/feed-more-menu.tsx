"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AtSign, Bookmark, Check, ChevronDown, Globe, Layers, List, MoreHorizontal, Sparkles } from "lucide-react";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils";

// Names, not components: the blog feed builds its items on the server.
const ICONS = { sparkles: Sparkles, series: Layers, globe: Globe, bookmark: Bookmark, mention: AtSign, list: List };

export type FeedMoreItem = {
  key: string;
  label: string;
  /** What the slot shows while this feed is open; the menu row keeps the full label. */
  shortLabel?: string;
  icon: keyof typeof ICONS;
  href: string;
  active?: boolean;
};

export type FeedMoreToggle = {
  key: string;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

export function FeedMoreMenu({
  items,
  toggles = [],
  label,
  activeKey,
  onPick,
}: {
  items: FeedMoreItem[];
  toggles?: FeedMoreToggle[];
  label: string;
  activeKey: string | null;
  onPick?: (item: FeedMoreItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const current = items.find((item) => item.key === activeKey) ?? null;
  const Icon = current ? ICONS[current.icon] : MoreHorizontal;

  return (
    <div ref={root} className="relative" data-feed-more>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={current ? `${label}: ${current.label}` : label}
        data-active={current ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "focus-ring touch-target inline-flex items-center gap-1 whitespace-nowrap rounded px-2.5 py-1.5 text-[15px] font-bold transition-colors",
          current
            ? "text-slate-900 dark:text-slate-100"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
        )}
      >
        <Icon aria-hidden className={cn("h-4 w-4 shrink-0", !current && "sm:hidden")} strokeWidth={current ? 2.25 : 2} />
        <span className="hidden max-w-[10rem] truncate sm:inline">{current ? (current.shortLabel ?? current.label) : label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-[var(--ease)] motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-11 z-20 w-56 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {items.map((item) => {
            const ItemIcon = ICONS[item.icon];
            return (
              <Link
                key={item.key}
                href={item.href}
                role="menuitem"
                aria-current={item.key === activeKey ? "page" : undefined}
                onClick={(e) => {
                  setOpen(false);
                  if (!onPick || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  onPick(item);
                }}
                className={cn(
                  "focus-ring flex w-full items-center gap-2.5 rounded-surface px-3 py-2 text-left text-[13px] hover:bg-slate-100 dark:hover:bg-slate-800",
                  item.key === activeKey ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-200",
                )}
              >
                <ItemIcon aria-hidden className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
          {items.length > 0 && toggles.length > 0 && (
            <div role="separator" className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
          )}
          {toggles.map((toggle) => (
            <button
              key={toggle.key}
              type="button"
              role="menuitemcheckbox"
              aria-checked={toggle.checked}
              onClick={() => toggle.onChange(!toggle.checked)}
              className="focus-ring flex w-full items-center justify-between rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {toggle.label}
              {toggle.checked && <Check className="h-4 w-4 text-accent-700 dark:text-accent-400" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
