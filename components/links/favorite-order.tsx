"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MyLink } from "@/types";
import { linkDisplayName } from "@/lib/link-library-view";

export function FavoriteOrder({ items, busy, onReorder }: { items: MyLink[]; busy: boolean; onReorder: (codes: string[]) => void }) {
  const t = useTranslations("dashboard.favorite");
  function move(index: number, delta: number) {
    const codes = items.map((item) => item.shortCode);
    [codes[index], codes[index + delta]] = [codes[index + delta], codes[index]];
    onReorder(codes);
  }
  return <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
    <h2 className="text-sm font-semibold">{t("orderTitle")}</h2>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("orderHint")}</p>
    <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item, index) => <li key={item.shortCode} className="flex min-h-14 items-center gap-3 py-1">
        <span className="w-5 shrink-0 text-xs tabular-nums text-slate-500">{index + 1}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{linkDisplayName(item)}</p><p className="truncate font-mono text-xs text-slate-500">/{item.shortCode}</p></div>
        <button type="button" onClick={() => move(index, -1)} disabled={busy || index === 0} aria-label={t("moveUp", { name: linkDisplayName(item) })} className="focus-ring grid h-11 w-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" onClick={() => move(index, 1)} disabled={busy || index === items.length - 1} aria-label={t("moveDown", { name: linkDisplayName(item) })} className="focus-ring grid h-11 w-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><ArrowDown className="h-4 w-4" /></button>
      </li>)}
    </ol>
  </section>;
}
