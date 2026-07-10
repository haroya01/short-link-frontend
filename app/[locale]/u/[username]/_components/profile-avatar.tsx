"use client";

import { useState } from "react";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  avatarUrl: string | null;
  username: string;
  /** Truthy when a banner sits behind the avatar — pulls it up to overlap + adds the light ring. */
  hasBanner: boolean;
  colors: ThemeColors;
};

/**
 * Avatar with the initial-letter fallback shared by the whole profile header. A broken image URL
 * (host down, expired signed URL, deleted upload) used to show the browser's broken-image glyph;
 * on {@code onError} we fall back to the same accent disc + initial the header already renders when
 * there's no avatar at all, so the failure looks like a deliberate empty state rather than a bug.
 */
export function ProfileAvatar({ avatarUrl, username, hasBanner, colors }: Props) {
  const [failed, setFailed] = useState(false);
  const initial = (username[0] ?? "·").toUpperCase();
  const ring = hasBanner ? "-mt-14 ring-white/95" : "ring-transparent";

  if (!avatarUrl || failed) {
    return (
      <div
        className={`grid h-24 w-24 place-items-center rounded-full text-[28px] font-semibold shadow-sm ring-4 ${ring} ${colors.avatar} ${colors.avatarText}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className={`h-24 w-24 overflow-hidden rounded-full shadow-sm ring-4 ${ring}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt={username}
        width={96}
        height={96}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
