"use client";

import { useEffect, useState } from "react";
import { readStorageString, writeStorageString } from "@/lib/storage-json";

const KEY = "kurl:me-initial";

/** AccountMenu calls this so the header avatar slot can paint the right initial before auth resolves. */
export function cacheMeInitial(initial: string) {
  writeStorageString(KEY, initial);
}

/**
 * The seeded-authed avatar placeholder shown while auth is still resolving (before AccountMenu mounts).
 * It mirrors AccountMenu's avatar button exactly — same accent circle + the cached initial — so the
 * top-right avatar no longer flashes (a grey blob → green circle) on every navigation. The initial is
 * read from localStorage (written by AccountMenu on a prior load); empty on a cold first visit.
 */
export function HeaderAvatarSlot() {
  const [initial, setInitial] = useState("");
  useEffect(() => {
    setInitial(readStorageString(KEY) ?? "");
  }, []);
  return (
    <div
      aria-hidden
      className="grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
    >
      {initial}
    </div>
  );
}
