"use client";

import { useEffect, useRef, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDismiss } from "@/hooks/use-dismiss";
import { listRevisions, type PostRevisionView } from "@/modules/blog/api/posts";

/**
 * Revision history dropdown for the editor. Opens to fetch the post's saved versions (captured on
 * publish/restore by the backend) and offers a one-click restore per version. Self-contained: it owns
 * its open state + fetch; the parent supplies the restore action (which reloads the editor).
 */
export function RevisionsButton({
  postId,
  busy,
  onRestore,
}: {
  postId: number;
  busy: boolean;
  onRestore: (versionNumber: number) => void;
}) {
  const t = useTranslations("postEditor");
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<PostRevisionView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listRevisions(postId)
      .then(setRevisions)
      .catch(() => setRevisions([]))
      .finally(() => setLoading(false));
  }, [open, postId]);

  useDismiss(open, ref, () => setOpen(false));

  const fmt = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={t("revisions")}
        aria-label={t("revisions")}
        className="focus-ring grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <History className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {t("revisions")}
          </div>
          {loading ? (
            <p className="px-3 py-4 text-[13px] text-slate-400">{t("loading")}</p>
          ) : !revisions || revisions.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-slate-400">{t("revisionsEmpty")}</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {revisions.map((r) => (
                <li
                  key={r.id}
                  className="group flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                      {t("revisionVersion", { n: r.versionNumber })}
                      {r.titleSnapshot ? ` · ${r.titleSnapshot}` : ""}
                    </span>
                    <span className="block text-[11px] text-slate-400">{fmt(r.createdAt)}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      onRestore(r.versionNumber);
                      setOpen(false);
                    }}
                    className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-accent-700 transition-colors hover:bg-accent-50 disabled:opacity-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("revisionRestore")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
