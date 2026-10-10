"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks/use-dismiss";
import { ReportButton } from "@/modules/blog/components/report-button";
import { useBlockAuthor } from "@/modules/notes/components/use-block-author";

/** ⋯ on someone else's comment: block its writer, report the comment. Nothing to offer → no button. */
export function CommentMenu({
  commentId,
  authorUsername,
  canReport,
  layerClassName,
}: {
  commentId?: number;
  authorUsername: string | null;
  canReport: boolean;
  layerClassName?: string;
}) {
  const t = useTranslations("notes");
  const tp = useTranslations("publicPost");
  const { authenticated, me } = useAuth();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const { blocked, block, unblock, confirmDialog } = useBlockAuthor(authorUsername ?? "", { layerClassName });

  const canBlock = authenticated && !!authorUsername && authorUsername !== me?.username;
  if (!canBlock && !canReport) return null;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("commentMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="touch-target rounded text-slate-500 transition-colors hover:text-slate-700 focus-ring dark:text-slate-400 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-36 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {canBlock && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void (blocked ? unblock() : block());
              }}
              className={cn(item, !blocked && "text-red-600 dark:text-red-400")}
            >
              {blocked ? t("unblock") : t("blockMenu")}
            </button>
          )}
          {canReport && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setReporting(true);
              }}
              className={item}
            >
              {tp("report")}
            </button>
          )}
        </div>
      )}
      {canReport && commentId != null && (
        <ReportButton subjectType="COMMENT" subjectId={commentId} open={reporting} onOpenChange={setReporting} />
      )}
      {confirmDialog}
    </div>
  );
}

const item =
  "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
