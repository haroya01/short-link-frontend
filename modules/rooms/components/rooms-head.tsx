"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils";
import type { RoomsView } from "@/modules/rooms/lib/rooms-view";

const ITEM =
  "focus-ring flex w-full items-center gap-2.5 rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
const PAD = 10;

export function RoomsHead({
  view,
  onView,
  onCreate,
  onJoin,
}: {
  view: RoomsView;
  onView: (view: RoomsView) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  const t = useTranslations("rooms");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  useDismiss(open, root, () => setOpen(false));

  useLayoutEffect(() => {
    const el = tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el) return;
    setBar({ left: el.offsetLeft + PAD, width: Math.max(el.offsetWidth - PAD * 2, 0) });
  }, [view, t]);

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <header
      data-rooms-head
      className="relative flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800"
    >
      <div ref={tabs} role="tablist" aria-label={t("title")} className="relative -ml-2.5 flex gap-1 text-[15px] font-bold">
        {(["rooms", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={view === key}
            data-rooms-view={key}
            onClick={() => onView(key)}
            className={cn(
              "focus-ring touch-target whitespace-nowrap rounded px-2.5 py-1.5 transition-colors",
              view === key
                ? "text-slate-900 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {key === "rooms" ? t("viewByRoom") : t("viewAll")}
          </button>
        ))}
        {bar && (
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-3 left-0 h-0.5 bg-slate-900 transition-[transform,width] duration-[240ms] ease-[var(--ease)] motion-reduce:transition-none dark:bg-slate-100"
            style={{ transform: `translateX(${bar.left}px)`, width: `${bar.width}px` }}
          />
        )}
      </div>
      <div ref={root} className="relative shrink-0">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("menu")}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring touch-target grid h-8 w-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Plus
            aria-hidden
            strokeWidth={2.25}
            className={cn(
              "h-[18px] w-[18px] transition-transform duration-200 ease-[var(--ease)] motion-reduce:transition-none",
              open && "rotate-45",
            )}
          />
        </button>
        {open && (
          <div
            role="menu"
            aria-label={t("menu")}
            className="absolute right-0 top-10 z-20 w-56 animate-fade-in rounded-surface border border-slate-200 bg-white p-1 shadow-float motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900"
          >
            <button type="button" role="menuitem" onClick={() => pick(onCreate)} className={ITEM}>
              <Plus aria-hidden className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              {t("create")}
            </button>
            <button type="button" role="menuitem" onClick={() => pick(onJoin)} className={ITEM}>
              <Link2 aria-hidden className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              {t("joinByLink")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
