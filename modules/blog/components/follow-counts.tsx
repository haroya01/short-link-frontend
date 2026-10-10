"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { readStorageJson, removeStorageItem, writeStorageJson } from "@/lib/storage-json";
import { fetchFollowStatus } from "@/modules/blog/lib/follow-status-cache";
import { inert } from "@/lib/utils";
import { FollowListDialog, type FollowTab } from "./follow-list-dialog";

type Counts = { followers: number; following: number };
const cacheKey = (u: string) => `kurl:followcounts:${u}`;
const isCounts = (v: unknown): v is Counts =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Counts).followers === "number" &&
  typeof (v as Counts).following === "number";

const inkNumber = (chunks: ReactNode) => (
  <span className="font-semibold text-slate-900 dark:text-slate-100">{chunks}</span>
);

/**
 * "팔로워 N · 팔로잉 N" on the author header for every viewer, then `trailing` (the post count). Each
 * count opens the followers / following modal at the matching tab. Seeds from a session cache (the
 * author tabs hard-navigate in the subdomain model, so without a seed the counts would fade in again on
 * every tab switch) and never flashes a misleading "0" — the row stays invisible until the counts are
 * known. An author who hides their counts, or a lookup that fails, drops the pair; the labels never
 * show without their numbers.
 */
export function FollowCounts({
  username,
  trailing,
  className = "",
}: {
  username: string;
  trailing?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("publicPost");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FollowTab>("followers");

  useEffect(() => {
    const cached = readStorageJson<Counts | null>(
      cacheKey(username),
      (v): v is Counts | null => v === null || isCounts(v),
      null,
      { session: true },
    );
    if (cached) setCounts(cached);
    fetchFollowStatus(username)
      .then((s) => {
        // Hidden author: the backend omits the count keys entirely. Purge any cached numbers too, so an
        // author who just hid their counts stops flashing the old values on the next visit.
        if (s.hideFollowerCount || s.followerCount == null || s.followingCount == null) {
          setHidden(true);
          removeStorageItem(cacheKey(username), { session: true });
          return;
        }
        const next = { followers: s.followerCount, following: s.followingCount };
        setCounts(next);
        writeStorageJson(cacheKey(username), next, { session: true });
      })
      .catch(() => setFailed(true));
  }, [username]);

  const settled = counts !== null || hidden || failed;
  const showPair = !hidden && (counts !== null || !settled);
  if (!showPair && !trailing) return null;

  function openTab(next: FollowTab) {
    setTab(next);
    setOpen(true);
  }

  const shown = counts ?? { followers: 0, following: 0 };
  const items: ReactNode[] = [];
  if (showPair) {
    items.push(
      <button
        key="followers"
        type="button"
        onClick={() => openTab("followers")}
        className="focus-ring rounded transition-colors hover:text-slate-900 dark:hover:text-slate-100"
      >
        {t.rich("countFollowers", { count: shown.followers, n: inkNumber })}
      </button>,
      <button
        key="following"
        type="button"
        onClick={() => openTab("following")}
        className="focus-ring rounded transition-colors hover:text-slate-900 dark:hover:text-slate-100"
      >
        {t.rich("countFollowing", { count: shown.following, n: inkNumber })}
      </button>,
    );
  }
  if (trailing) items.push(<span key="trailing">{trailing}</span>);

  return (
    <>
      <div
        data-profile-counts
        // Until the counts land the row is invisible; also make it inert (no clicks, out of the a11y
        // tree) so an invisible button can't open the list with a placeholder "0".
        {...inert(!settled)}
        className={`flex flex-wrap items-center text-[13px] text-slate-500 transition-opacity duration-300 dark:text-slate-400 ${
          settled ? "opacity-100" : "pointer-events-none opacity-0"
        } ${className}`}
      >
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span aria-hidden className="mx-1.5 text-slate-300 dark:text-slate-600">
                ·
              </span>
            )}
            {item}
          </Fragment>
        ))}
      </div>
      {showPair && (
        <FollowListDialog
          username={username}
          open={open}
          tab={tab}
          onTabChange={setTab}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
