"use client";

import { useEffect, useState } from "react";
import { FileText, MessageSquareText, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { blogHref } from "@/lib/host";
import { BlogLink } from "@/modules/blog/components/blog-link";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { useToast } from "@/components/ui/toast";
import { listMyPosts, type PostView } from "@/modules/blog/api/posts";
import { useCompactTime } from "@/modules/notes/lib/use-compact-time";
import {
  deleteNoteDraft,
  noteDraftLabel,
  saveNoteDraft,
  useNoteDrafts,
  type NoteDraft,
} from "@/modules/notes/lib/note-drafts";

type Segment = "note" | "longform";

const ROW =
  "focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-surface px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800";

export function NoteDraftsSheet({
  open,
  onClose,
  onPick,
  currentId = null,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (draft: NoteDraft) => void;
  currentId?: string | null;
}) {
  const t = useTranslations("notes");
  const tc = useTranslations("compose");
  const { me } = useAuth();
  const drafts = useNoteDrafts(me?.id).filter((d) => d.id !== currentId);
  const ago = useCompactTime();
  const { toast } = useToast();
  const [segment, setSegment] = useState<Segment>("note");
  const [posts, setPosts] = useState<PostView[] | null>(null);

  useEffect(() => {
    if (!open || segment !== "longform" || posts) return;
    let live = true;
    listMyPosts()
      .then((all) => live && setPosts(all.filter((p) => p.status === "DRAFT")))
      .catch(() => live && setPosts([]));
    return () => {
      live = false;
    };
  }, [open, segment, posts]);

  function remove(draft: NoteDraft) {
    if (!me) return;
    deleteNoteDraft(me.id, draft.id);
    toast(t("draftDeleted"), "default", {
      action: { label: t("draftUndo"), onClick: () => saveNoteDraft(me.id, draft) },
    });
  }

  return (
    <BottomSheet open={open} onClose={onClose} label={t("draftsTitle")} panelClassName="sm:mx-auto sm:max-w-md sm:bottom-6 sm:rounded-surface sm:border">
      <div role="tablist" aria-label={t("draftsTitle")} className="mb-2 flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
        {(["note", "longform"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={segment === key}
            onClick={() => setSegment(key)}
            className={cn(
              "focus-ring flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              segment === key
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            {key === "note" ? tc("note") : tc("longform")}
          </button>
        ))}
      </div>
      {segment === "note" ? (
        drafts.length === 0 ? (
          <p className="px-3 py-8 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("draftsEmpty")}</p>
        ) : (
          <ul data-testid="note-drafts">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onPick(draft);
                    onClose();
                  }}
                  className={ROW}
                >
                  <MessageSquareText aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">
                      {noteDraftLabel(draft)}
                    </span>
                    <span className="block text-[12px] text-slate-500 dark:text-slate-400">
                      {ago(new Date(draft.updatedAt).toISOString())}
                      {draft.parts.length > 0 && ` · ${tc("noteParts", { count: draft.parts.length + 1 })}`}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(draft)}
                  aria-label={t("draftDelete")}
                  className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : posts === null ? (
        <p className="px-3 py-8 text-center text-[14px] text-slate-500 dark:text-slate-400" aria-busy>
          …
        </p>
      ) : posts.length === 0 ? (
        <p className="px-3 py-8 text-center text-[14px] text-slate-500 dark:text-slate-400">{t("draftsEmpty")}</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <BlogLink href={blogHref(`/write/${post.id}`)} className={ROW}>
                <FileText aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">
                    {post.title.trim() || tc("untitled")}
                  </span>
                  <span className="block text-[12px] text-slate-500 dark:text-slate-400">{ago(post.updatedAt)}</span>
                </span>
              </BlogLink>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}

/** "초안 N" — opens the drafts sheet; nothing when this account has no other note drafts on this device. */
export function NoteDraftsButton({
  onPick,
  currentId = null,
  hidden = false,
  className,
}: {
  onPick: (draft: NoteDraft) => void;
  currentId?: string | null;
  /** Keeps an open sheet mounted while the button itself is not shown (the inline composer collapsed behind it). */
  hidden?: boolean;
  className?: string;
}) {
  const t = useTranslations("notes");
  const { me } = useAuth();
  const count = useNoteDrafts(me?.id).filter((d) => d.id !== currentId).length;
  const [open, setOpen] = useState(false);
  if (count === 0 && !open) return null;
  return (
    <>
      {!hidden && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          data-testid="note-drafts-button"
          className={cn(
            "focus-ring rounded px-1 text-[14px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            className,
          )}
        >
          {t("drafts", { count })}
        </button>
      )}
      <NoteDraftsSheet open={open} onClose={() => setOpen(false)} onPick={onPick} currentId={currentId} />
    </>
  );
}
