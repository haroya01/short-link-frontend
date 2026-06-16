"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { Connection } from "@/modules/blog/api/collections";

/**
 * Reorder a PATH's connections — the order IS the argument's flow (A-척추 Stage 3). Drag a row to move
 * it, or use the up/down buttons (keyboard / touch fallback). Saving writes the full ordered id list
 * to the reorder endpoint once. Quiet: a hairline list, a drag handle, the curator's line + a one-line
 * label per row.
 */
export function PathReorder({
  connections,
  onCancel,
  onSave,
}: {
  connections: Connection[];
  onCancel: () => void;
  onSave: (orderedIds: number[]) => void;
}) {
  const t = useTranslations("collections");
  const [items, setItems] = useState<Connection[]>(connections);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
  }

  function label(c: Connection): string {
    return c.quote ?? c.title ?? c.body ?? "";
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
          {t("reorderTitle")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => onSave(items.map((c) => c.id))}
            className="focus-ring rounded-lg bg-accent-700 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-800"
          >
            {t("save")}
          </button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {items.map((c, i) => (
          <li
            key={c.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) {
                move(dragIndex, i);
                setDragIndex(i);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`flex items-start gap-3 px-3 py-3 ${dragIndex === i ? "opacity-50" : ""}`}
          >
            <span aria-hidden className="mt-0.5 cursor-grab text-slate-300 active:cursor-grabbing dark:text-slate-600">
              <GripVertical className="h-4 w-4" />
            </span>
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center text-[12px] font-bold text-accent-700 dark:text-accent-400">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {c.why && (
                <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">{c.why}</p>
              )}
              <p className="line-clamp-2 text-[14px] leading-snug text-slate-800 dark:text-slate-200">
                {label(c)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label={t("moveUp")}
                className="focus-ring rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, i + 1)}
                disabled={i === items.length - 1}
                aria-label={t("moveDown")}
                className="focus-ring rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30 dark:hover:text-slate-200"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
