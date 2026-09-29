"use client";

import { useState } from "react";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  avatarUrl: string | null;
  username: string;
  colors: ThemeColors;
};

/**
 * Avatar with the initial-letter fallback shared by the whole profile header. A broken image URL
 * (host down, expired signed URL, deleted upload) used to show the browser's broken-image glyph;
 * on {@code onError} we fall back to the same accent disc + initial the header already renders when
 * there's no avatar at all, so the failure looks like a deliberate empty state rather than a bug.
 */
export function ProfileAvatar({ avatarUrl, username, colors }: Props) {
  const [failed, setFailed] = useState(false);
  const initial = (username[0] ?? "·").toUpperCase();

  if (!avatarUrl || failed) {
    return (
      <div
        data-profile-avatar
        className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-[22px] font-semibold ${colors.avatar} ${colors.avatarText}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div data-profile-avatar className="h-16 w-16 shrink-0 overflow-hidden rounded-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt={username}
        width={64}
        height={64}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
