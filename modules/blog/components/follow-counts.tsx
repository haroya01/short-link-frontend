"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { readStorageJson, removeStorageItem, writeStorageJson } from "@/lib/storage-json";
import { fetchFollowStatus } from "@/modules/blog/lib/follow-status-cache";
import { FollowListDialog, type FollowTab } from "./follow-list-dialog";

type Counts = { followers: number; following: number };
const cacheKey = (u: string) => `kurl:followcounts:${u}`;
const isCounts = (v: unknown): v is Counts =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Counts).followers === "number" &&
  typeof (v as Counts).following === "number";

/**
 * Tappable "팔로워 N · 팔로잉 N" on the author header. Each count opens the followers / following
 * modal at the matching tab. Seeds from a session cache (the author tabs hard-navigate in the
 * subdomain model, so without a seed the counts would fade in again on every tab switch) and never
 * flashes a misleading "0" — the row stays invisible until a count is known.
 */
export function FollowCounts({ username }: { username: string }) {
  const t = useTranslations("publicPost");
  const [counts, setCounts] = useState<Counts | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FollowTab>("followers");

  // Null once we know the author hides their counts — the row unmounts entirely (see below).
  const [hidden, setHidden] = useState(false);

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
        // Hidden author: the backend omits the count keys entirely. Drop the row rather than showing
        // a stale "0" — the follow button beside it still carries the relationship. Purge any cached
        // visible numbers too, so an author who just hid their counts stops flashing the old values on
        // the next visit before this refetch resolves.
        if (s.hideFollowerCount || s.followerCount == null || s.followingCount == null) {
          setHidden(true);
          removeStorageItem(cacheKey(username), { session: true });
          return;
        }
        const next = { followers: s.followerCount, following: s.followingCount };
        setCounts(next);
        writeStorageJson(cacheKey(username), next, { session: true });
      })
      .catch(() => {});
  }, [username]);

  function openTab(next: FollowTab) {
    setTab(next);
    setOpen(true);
  }

  // The author opted out of showing counts — render nothing (not even the modal trigger). The
  // followers/following lists are the count made visible, so we hide them together.
  if (hidden) return null;

  return (
    <>
      <div
        // Until the counts land the row is invisible; also make it inert (no clicks, out of the a11y
        // tree) so an invisible button can't open the list with a placeholder "0".
        aria-hidden={!counts}
        className={`flex items-center gap-2.5 text-[13px] text-slate-500 transition-opacity duration-300 dark:text-slate-400 ${
          counts ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={() => openTab("followers")}
          className="focus-ring rounded transition-colors hover:text-slate-900 dark:hover:text-slate-100"
        >
          {t("followers", { count: counts?.followers ?? 0 })}
        </button>
        <span aria-hidden className="text-slate-300 dark:text-slate-600">
          ·
        </span>
        <button
          type="button"
          onClick={() => openTab("following")}
          className="focus-ring rounded transition-colors hover:text-slate-900 dark:hover:text-slate-100"
        >
          {t("followingCount", { count: counts?.following ?? 0 })}
        </button>
      </div>
      <FollowListDialog
        username={username}
        open={open}
        tab={tab}
        onTabChange={setTab}
        onOpenChange={setOpen}
      />
    </>
  );
}
