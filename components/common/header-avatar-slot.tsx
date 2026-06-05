"use client";

import { useEffect, useState } from "react";
import { readStorageString, writeStorageString } from "@/lib/storage-json";

const KEY = "kurl:me-initial";
const AVATAR_KEY = "kurl:me-avatar";

/** AccountMenu calls this so the header avatar slot can paint the right initial before auth resolves. */
export function cacheMeInitial(initial: string) {
  writeStorageString(KEY, initial);
}

/** Cache the viewer's avatar URL so the slot can paint the photo (not just the initial) before auth
 *  resolves — empty string clears it (e.g. an avatar was removed). */
export function cacheMeAvatar(url: string) {
  writeStorageString(AVATAR_KEY, url);
}

/**
 * The seeded-authed avatar placeholder shown while auth is still resolving (before AccountMenu mounts).
 * It mirrors AccountMenu's avatar button exactly — the cached photo if there is one, otherwise the
 * accent circle + cached initial — so the top-right avatar no longer flashes (grey blob → green
 * circle / photo) on every navigation. Both are read from localStorage (written by AccountMenu on a
 * prior load); empty on a cold first visit.
 */
export function HeaderAvatarSlot() {
  const [initial, setInitial] = useState("");
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    setInitial(readStorageString(KEY) ?? "");
    setAvatar(readStorageString(AVATAR_KEY) ?? "");
  }, []);
  return (
    <div
      aria-hidden
      className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
