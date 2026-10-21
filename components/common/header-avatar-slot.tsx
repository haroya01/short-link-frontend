"use client";

import { useEffect, useState } from "react";
import { readStorageString, writeStorageString } from "@/lib/storage-json";
import { cn } from "@/lib/utils";
import { avatarTint, avatarTintStyle } from "@/lib/avatar-tint";

const KEY = "kurl:me-initial";
const HANDLE_KEY = "kurl:me-handle";
const AVATAR_KEY = "kurl:me-avatar";

/** AccountMenu calls this so the header avatar slot can paint the right initial and tint before auth resolves. */
export function cacheMeInitial(initial: string, handle: string) {
  writeStorageString(KEY, initial);
  writeStorageString(HANDLE_KEY, handle);
}

/** Cache the viewer's avatar URL so the slot can paint the photo (not just the initial) before auth
 *  resolves — empty string clears it (e.g. an avatar was removed). */
export function cacheMeAvatar(url: string) {
  writeStorageString(AVATAR_KEY, url);
}

/**
 * The seeded-authed avatar placeholder shown while auth is still resolving (before AccountMenu mounts).
 * It mirrors AccountMenu's avatar button exactly — the cached photo if there is one, otherwise the
 * tinted circle + cached initial — so the top-right avatar no longer flashes (grey blob → tinted
 * circle / photo) on every navigation. Both are read from localStorage (written by AccountMenu on a
 * prior load); empty on a cold first visit.
 */
export function HeaderAvatarSlot() {
  const [initial, setInitial] = useState("");
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    setInitial(readStorageString(KEY) ?? "");
    setHandle(readStorageString(HANDLE_KEY) ?? "");
    setAvatar(readStorageString(AVATAR_KEY) ?? "");
  }, []);
  return <MeAvatar src={avatar} initial={initial} handle={handle} className="h-8 w-8 text-[13px]" />;
}

export function MeAvatar({
  src,
  initial,
  handle,
  className,
}: {
  src: string;
  initial: string;
  handle: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-avatar-tint={avatarTint(handle)}
      style={avatarTintStyle(avatarTint(handle))}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--avatar-bg)] font-semibold text-[var(--avatar-fg)]",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
