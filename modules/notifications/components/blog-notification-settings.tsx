"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AtSign,
  Bell,
  BellRing,
  BookMarked,
  ChartBar,
  GitBranch,
  Heart,
  Highlighter,
  Link2,
  Lock,
  MessageCircle,
  Pencil,
  Quote,
  Repeat2,
  Reply,
  TextQuote,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/common/error-state";
import { cn } from "@/lib/utils";
import type {
  BlogNotificationPreferences,
  NotificationType,
} from "@/modules/notifications/api/notifications";
import {
  getBlogNotificationPreferences,
  updateBlogNotificationPreference,
} from "@/modules/notifications/api/notifications";

/**
 * Per-type mute controls for blog notifications. Loads the author's opt-out map once, then flips each
 * row optimistically and reconciles against the PUT — the same load-then-mutate shape as the other
 * settings rows. On is the default for every type, so an empty backend still renders every switch
 * "on". Separate from the browser web-push toggle above (that's the transport; this is which kinds of
 * notifications get produced at all).
 */

type Row = { type: NotificationType; icon: LucideIcon; labelKey: string; hintKey: string };

export const SECTIONS: { titleKey: string; rows: Row[] }[] = [
  {
    titleKey: "prefSectionPosts",
    rows: [
      { type: "LIKE", icon: Heart, labelKey: "prefLike", hintKey: "prefLikeHint" },
      { type: "COMMENT", icon: MessageCircle, labelKey: "prefComment", hintKey: "prefCommentHint" },
      { type: "HIGHLIGHT", icon: Highlighter, labelKey: "prefHighlight", hintKey: "prefHighlightHint" },
      { type: "POST_QUOTE", icon: Quote, labelKey: "prefPostQuote", hintKey: "prefPostQuoteHint" },
      { type: "CONNECTED", icon: Link2, labelKey: "prefConnected", hintKey: "prefConnectedHint" },
    ],
  },
  {
    titleKey: "prefSectionNotes",
    rows: [
      { type: "NOTE_LIKE", icon: Heart, labelKey: "prefNoteLike", hintKey: "prefNoteLikeHint" },
      { type: "NOTE_REPOST", icon: Repeat2, labelKey: "prefNoteRepost", hintKey: "prefNoteRepostHint" },
      { type: "NOTE_REPLY", icon: Reply, labelKey: "prefNoteReply", hintKey: "prefNoteReplyHint" },
      { type: "NOTE_QUOTE", icon: Quote, labelKey: "prefNoteQuote", hintKey: "prefNoteQuoteHint" },
      { type: "NOTE_EMBED", icon: TextQuote, labelKey: "prefNoteEmbed", hintKey: "prefNoteEmbedHint" },
    ],
  },
  {
    titleKey: "prefSectionConversation",
    rows: [
      { type: "REPLY", icon: Reply, labelKey: "prefReply", hintKey: "prefReplyHint" },
      { type: "COMMENT_LIKE", icon: Heart, labelKey: "prefCommentLike", hintKey: "prefCommentLikeHint" },
      { type: "MENTION", icon: AtSign, labelKey: "prefMention", hintKey: "prefMentionHint" },
      { type: "NOTE_MENTION", icon: AtSign, labelKey: "prefNoteMention", hintKey: "prefNoteMentionHint" },
    ],
  },
  {
    titleKey: "prefSectionPeople",
    rows: [
      { type: "FOLLOW", icon: UserPlus, labelKey: "prefFollow", hintKey: "prefFollowHint" },
      { type: "FOLLOW_REQUEST", icon: Lock, labelKey: "prefFollowRequest", hintKey: "prefFollowRequestHint" },
      { type: "REMOTE_FOLLOW", icon: UserPlus, labelKey: "prefRemoteFollow", hintKey: "prefRemoteFollowHint" },
      {
        type: "SERIES_SUBSCRIBE",
        icon: BookMarked,
        labelKey: "prefSeriesSubscribe",
        hintKey: "prefSeriesSubscribeHint",
      },
    ],
  },
  {
    titleKey: "prefSectionSubscriptions",
    rows: [
      { type: "NEW_POST", icon: Bell, labelKey: "prefNewPost", hintKey: "prefNewPostHint" },
      { type: "NOTE_POST", icon: BellRing, labelKey: "prefNotePost", hintKey: "prefNotePostHint" },
      { type: "NOTE_POLL", icon: ChartBar, labelKey: "prefNotePoll", hintKey: "prefNotePollHint" },
      { type: "NOTE_EDIT", icon: Pencil, labelKey: "prefNoteEdit", hintKey: "prefNoteEditHint" },
      { type: "PATH_GREW", icon: GitBranch, labelKey: "prefPathGrew", hintKey: "prefPathGrewHint" },
    ],
  },
];

const ROWS = SECTIONS.flatMap((section) => section.rows);

export function BlogNotificationSettings() {
  const t = useTranslations("notifications");
  const [prefs, setPrefs] = useState<BlogNotificationPreferences | null>(null);
  const [error, setError] = useState(false);
  // Guards against a second flip racing an in-flight PUT for the same type.
  const [pending, setPending] = useState<Partial<Record<NotificationType, boolean>>>({});

  const load = useCallback(() => {
    setError(false);
    let alive = true;
    getBlogNotificationPreferences()
      .then((p) => {
        if (alive) setPrefs(p);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  async function toggle(type: NotificationType) {
    if (!prefs || pending[type]) return;
    const next = !(prefs[type] ?? true);
    setPrefs({ ...prefs, [type]: next }); // optimistic
    setPending((p) => ({ ...p, [type]: true }));
    try {
      await updateBlogNotificationPreference(type, next);
    } catch {
      // roll back only this row; other rows keep their (independent) state
      setPrefs((cur) => (cur ? { ...cur, [type]: !next } : cur));
    } finally {
      setPending((p) => {
        const rest = { ...p };
        delete rest[type];
        return rest;
      });
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t("blogPrefsTitle")}
      </h2>
      <p className="mb-3 text-[12px] text-slate-500 dark:text-slate-400">{t("blogPrefsSubtitle")}</p>

      {error ? (
        <ErrorState message={t("blogPrefsError")} onRetry={load} />
      ) : prefs === null ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
          {ROWS.map((r) => (
            <div key={r.type} className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.titleKey}>
              <h3 className="mb-1.5 px-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                {t(section.titleKey)}
              </h3>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 p-2 dark:divide-slate-800 dark:border-slate-800">
                {section.rows.map(({ type, icon: Icon, labelKey, hintKey }) => (
                  <div key={type} className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm">
                    <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                      <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-400" />
                      <span className="flex flex-col">
                        {t(labelKey)}
                        <span className="text-[12px] text-slate-500 dark:text-slate-400">{t(hintKey)}</span>
                      </span>
                    </span>
                    <Switch
                      checked={prefs[type] ?? true}
                      aria-label={t(labelKey)}
                      disabled={Boolean(pending[type])}
                      onClick={() => toggle(type)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
