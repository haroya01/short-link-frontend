"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/hooks/use-dismiss";
import { ReportButton } from "@/modules/blog/components/report-button";
import { useBlockAuthor } from "@/modules/notes/components/use-block-author";

/**
 * A reader's ⋯ on someone else's post, in the slot the owner's edit/delete takes: block the author and
 * report the post, as on iOS. Blocking needs an account; reporting doesn't.
 */
export function PostReaderMenu({ postId, authorUsername }: { postId: number; authorUsername: string }) {
  const t = useTranslations("notes");
  const tp = useTranslations("publicPost");
  const { ready, authenticated, me } = useAuth();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));
  const { blocked, block, unblock, confirmDialog } = useBlockAuthor(authorUsername);

  if (!ready || me?.username === authorUsername) return null;

  return (
    <div ref={root} className="relative border-l border-slate-200 pl-1.5 dark:border-slate-700">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("postMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="touch-target focus-ring grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-40 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {authenticated && (
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
        </div>
      )}
      <ReportButton subjectType="POST" subjectId={postId} open={reporting} onOpenChange={setReporting} />
      {confirmDialog}
    </div>
  );
}

const item =
  "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
