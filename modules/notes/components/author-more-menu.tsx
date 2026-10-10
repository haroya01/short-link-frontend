"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { useDismiss } from "@/hooks/use-dismiss";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useFollowShared } from "@/modules/blog/lib/follow-store";
import { ReportButton } from "@/modules/blog/components/report-button";
import {
  getMuteStatus,
  getRepostVisibility,
  setRepostsHidden,
  unmuteUser,
  type MuteStatus,
} from "@/modules/notes/api/notes";
import { MuteDialog } from "./mute-dialog";
import { NoteListMembershipDialog } from "./note-list-membership-dialog";
import { useBlockAuthor } from "./use-block-author";

const UNKNOWN = { following: false, count: 0, countHidden: false };

export function AuthorMoreMenu({ username, userId }: { username: string; userId: number }) {
  const t = useTranslations("notes");
  const tp = useTranslations("publicPost");
  const { toast } = useToast();
  const { ready, authenticated, me } = useAuth();
  const [follow] = useFollowShared(username, UNKNOWN);
  const { blocked, block, unblock, confirmDialog } = useBlockAuthor(username);
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, root, () => setOpen(false));

  const [addingToList, setAddingToList] = useState(false);
  const [muting, setMuting] = useState(false);
  const [mute, setMute] = useState<MuteStatus | null>(null);
  const [reporting, setReporting] = useState(false);
  const signedInOther = authenticated && me?.username !== username;
  const active = signedInOther && follow.following;

  useEffect(() => {
    if (!active) return;
    let live = true;
    getRepostVisibility(username)
      .then((visibility) => live && setHidden(visibility.hidden))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [active, username]);

  useEffect(() => {
    if (!signedInOther) return;
    let live = true;
    getMuteStatus(username)
      .then((status) => live && setMute(status))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [signedInOther, username]);

  if (!ready || me?.username === username) return null;

  async function unmute() {
    setOpen(false);
    try {
      await unmuteUser(username);
      setMute({ muted: false, notifications: false, expiresAt: null });
      toast(t("unmutedToast", { username }));
    } catch {
      toast(t("muteFailed"), "error");
    }
  }

  async function toggle() {
    const next = !hidden;
    setOpen(false);
    setHidden(next);
    try {
      setHidden((await setRepostsHidden(username, next)).hidden);
      toast(next ? t("repostsHiddenFrom", { username }) : t("repostsShownFrom", { username }));
    } catch {
      setHidden(!next);
      toast(t("settingFailed"), "error");
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={t("authorMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring touch-target inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 w-48 rounded-surface border border-slate-200 bg-white p-1 shadow-float dark:border-slate-800 dark:bg-slate-900"
        >
          {signedInOther && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setAddingToList(true);
              }}
              className={item}
            >
              {t("addToList")}
            </button>
          )}
          {active && hidden !== null && (
            <button type="button" role="menuitem" onClick={toggle} className={item}>
              {hidden ? t("showRepostsFrom") : t("hideRepostsFrom")}
            </button>
          )}
          {mute &&
            (mute.muted ? (
              <button type="button" role="menuitem" onClick={unmute} className={item}>
                {t("unmute")}
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setMuting(true);
                }}
                className={item}
              >
                {t("muteMenu")}
              </button>
            ))}
          {signedInOther && (
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
      <ReportButton subjectType="USER" subjectId={userId} open={reporting} onOpenChange={setReporting} />
      <NoteListMembershipDialog username={username} open={addingToList} onClose={() => setAddingToList(false)} />
      <MuteDialog username={username} open={muting} onClose={() => setMuting(false)} onMuted={setMute} />
      {confirmDialog}
    </div>
  );
}

const item =
  "focus-ring block w-full rounded-surface px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";
