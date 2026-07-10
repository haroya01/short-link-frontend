"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, UserCheck, UserPlus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Avatar } from "@/modules/blog/components/avatar";
import { authorHref } from "@/modules/blog/components/feed-card";
import { BlogLink } from "@/modules/blog/components/blog-link";
import {
  followUser,
  listFollowers,
  listFollowing,
  unfollowUser,
  type FollowUser,
} from "@/modules/blog/api/follows";

export type FollowTab = "followers" | "following";

/**
 * The followers / following lists for an author (Medium-style). A focus-trapped, scroll-locked
 * modal with a two-tab header; each tab is a paginated list of author rows, each with an inline
 * follow toggle seeded from the row's `followedByMe` (so the list doesn't fire an N+1 of status
 * fetches). Tapping a row soft-navigates to that author. Open/tab state is owned by the caller.
 */
export function FollowListDialog({
  username,
  open,
  tab,
  onTabChange,
  onOpenChange,
}: {
  username: string;
  open: boolean;
  tab: FollowTab;
  onTabChange: (tab: FollowTab) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("publicPost");
  const locale = useLocale();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<FollowUser[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);

  useFocusTrap(panelRef, { active: open, onEscape: () => onOpenChange(false) });

  // Lock the page behind the modal (the panel owns its own scroll).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const load = useCallback(
    async (next: number) => {
      setLoading(true);
      try {
        const fetcher = tab === "followers" ? listFollowers : listFollowing;
        const res = await fetcher(username, next);
        setItems((prev) => (next === 0 ? res.items : [...prev, ...res.items]));
        setPage(res.page);
        setHasNext(res.hasNext);
      } catch {
        if (next === 0) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [tab, username],
  );

  // (Re)load page 0 whenever the modal opens or the tab switches.
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setHasNext(false);
    void load(0);
  }, [open, tab, load]);

  if (!open) return null;

  const empty = !loading && items.length === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 pt-12 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-16">
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/70"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tab === "followers" ? t("followersTab") : t("followingTab")}
        tabIndex={-1}
        className="relative mx-auto flex max-h-[calc(100dvh-4rem)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl animate-fade-in dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Tab header — two segments + a close affordance. */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800">
          <TabButton active={tab === "followers"} onClick={() => onTabChange("followers")}>
            {t("followersTab")}
          </TabButton>
          <TabButton active={tab === "following"} onClick={() => onTabChange("following")}>
            {t("followingTab")}
          </TabButton>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="focus-ring mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
            aria-label={t("imageClose")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {empty && (
            <p className="px-3 py-10 text-center text-[14px] text-slate-500 dark:text-slate-400">
              {tab === "followers" ? t("followersEmpty") : t("followingEmpty")}
            </p>
          )}
          <ul>
            {items.map((u) => (
              <FollowRow key={u.id} user={u} locale={locale} onNavigate={() => onOpenChange(false)} />
            ))}
          </ul>
          {hasNext && !loading && (
            <button
              type="button"
              onClick={() => void load(page + 1)}
              className="focus-ring mx-auto mt-1 block rounded-full px-4 py-2 text-[13px] font-medium text-accent-700 transition-colors hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10"
            >
              {t("loadMore")}
            </button>
          )}
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring flex-1 px-4 py-3 text-[14px] font-semibold transition-colors",
        active
          ? "text-slate-900 dark:text-slate-100"
          : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300",
      )}
      aria-pressed={active}
    >
      <span className="relative inline-block pb-2">
        {children}
        {active && (
          <span className="absolute inset-x-0 -bottom-[13px] h-0.5 rounded-full bg-accent-700 dark:bg-accent-400" />
        )}
      </span>
    </button>
  );
}

/** One author row — avatar + handle + bio, with an inline follow toggle on the right. */
function FollowRow({
  user,
  locale,
  onNavigate,
}: {
  user: FollowUser;
  locale: string;
  onNavigate: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <BlogLink
        href={authorHref(user.username, locale)}
        onClick={onNavigate}
        className="focus-ring group flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar src={user.avatarUrl} name={user.username} size="md" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-slate-800 group-hover:text-slate-900 dark:text-slate-200">
            @{user.username}
          </span>
          {user.bio && (
            <span className="truncate text-[12px] text-slate-500 dark:text-slate-400">{user.bio}</span>
          )}
        </span>
      </BlogLink>
      <RowFollowButton username={user.username} initialFollowing={user.followedByMe} />
    </li>
  );
}

/**
 * A compact follow toggle seeded from the list row's `followedByMe` — no per-row status fetch.
 * Hidden on your own row; an anonymous click starts sign-in. Optimistic with rollback.
 */
function RowFollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const t = useTranslations("publicPost");
  const { authenticated, ready, me, signInWithGoogle } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (ready && me?.username === username) return null;

  async function toggle() {
    if (!authenticated) {
      signInWithGoogle();
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    try {
      if (next) await followUser(username);
      else await unfollowUser(username);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={following}
      className={cn(
        "touch-target inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-colors focus-ring",
        following
          ? "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
          : "border-transparent bg-accent-700 text-white hover:bg-accent-800",
      )}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? t("following") : t("follow")}
    </button>
  );
}
