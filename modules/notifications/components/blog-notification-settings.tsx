"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AtSign,
  Bell,
  BookMarked,
  GitBranch,
  Heart,
  Link2,
  MessageCircle,
  Reply,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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

/** Render order + icon per type. Labels/hints come from the `notifications` catalog by type key. */
const ROWS: { type: NotificationType; icon: LucideIcon; labelKey: string; hintKey: string }[] = [
  { type: "LIKE", icon: Heart, labelKey: "prefLike", hintKey: "prefLikeHint" },
  { type: "COMMENT", icon: MessageCircle, labelKey: "prefComment", hintKey: "prefCommentHint" },
  { type: "REPLY", icon: Reply, labelKey: "prefReply", hintKey: "prefReplyHint" },
  { type: "MENTION", icon: AtSign, labelKey: "prefMention", hintKey: "prefMentionHint" },
  { type: "FOLLOW", icon: UserPlus, labelKey: "prefFollow", hintKey: "prefFollowHint" },
  {
    type: "SERIES_SUBSCRIBE",
    icon: BookMarked,
    labelKey: "prefSeriesSubscribe",
    hintKey: "prefSeriesSubscribeHint",
  },
  { type: "NEW_POST", icon: Bell, labelKey: "prefNewPost", hintKey: "prefNewPostHint" },
  { type: "CONNECTED", icon: Link2, labelKey: "prefConnected", hintKey: "prefConnectedHint" },
  { type: "PATH_GREW", icon: GitBranch, labelKey: "prefPathGrew", hintKey: "prefPathGrewHint" },
];

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
    const next = !prefs[type];
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
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 p-2 dark:divide-slate-800 dark:border-slate-800">
          {ROWS.map(({ type, icon: Icon, labelKey, hintKey }) => {
            const on = prefs[type];
            return (
              <div
                key={type}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm"
              >
                <span className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="flex flex-col">
                    {t(labelKey)}
                    <span className="text-[12px] text-slate-500 dark:text-slate-500">
                      {t(hintKey)}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t(labelKey)}
                  disabled={Boolean(pending[type])}
                  onClick={() => toggle(type)}
                  className={cn(
                    "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                    on ? "bg-accent-600" : "bg-slate-200 dark:bg-slate-700",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      on ? "translate-x-[1.375rem]" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
