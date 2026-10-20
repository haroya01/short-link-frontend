"use client";

import { useRef, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils";

const ITEM =
  "focus-ring flex w-full items-center gap-2.5 rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

export function RoomsHead({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const t = useTranslations("rooms");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <header
      data-rooms-head
      className="relative flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800"
    >
      <div ref={root} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("menu")}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring touch-target relative -ml-2.5 inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[15px] font-bold text-slate-900 dark:text-slate-100"
        >
          {t("title")}
          <Plus
            aria-hidden
            strokeWidth={2.25}
            className={cn(
              "h-4 w-4 text-slate-500 transition-transform duration-200 ease-[var(--ease)] motion-reduce:transition-none dark:text-slate-400",
              open && "rotate-45",
            )}
          />
          <span aria-hidden className="absolute inset-x-2.5 -bottom-3 h-0.5 bg-slate-900 dark:bg-slate-100" />
        </button>
        {open && (
          <div
            role="menu"
            aria-label={t("menu")}
            className="absolute left-0 top-11 z-20 w-56 animate-fade-in rounded-surface border border-slate-200 bg-white p-1 shadow-float motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900"
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
