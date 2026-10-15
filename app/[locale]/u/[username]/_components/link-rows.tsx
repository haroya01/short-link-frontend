import type { CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import { Favicon } from "@/components/common/favicon";
import type { PublicProfileEntry } from "@/types";
import type { ThemeColors } from "../_lib/theme";
import { isProtectedLink, protectedTitle } from "../_lib/protected-link";
import { hostOf, isSpotifyUrl } from "../_lib/url-helpers";
import { ProtectedMark } from "./protected-mark";

type Props = {
  entries: PublicProfileEntry[];
  username: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/** 연달아 놓인 보통 링크는 카드 여러 장이 아니라 한 장의 목록 — 줄 사이만 선으로 가른다. */
export function LinkRows({ entries, username, colors, fadeStyle }: Props) {
  return (
    <li className="profile-fade" style={fadeStyle}>
      <ul className={`profile-card-static overflow-hidden ${colors.card} ${colors.cardBorder}`}>
        {entries.map((entry, i) => {
          const locked = isProtectedLink(entry);
          const originalUrl = locked ? "" : entry.originalUrl ?? "";
          const host = hostOf(originalUrl);
          return (
            <li key={entry.id ?? entry.shortCode ?? i} className={i > 0 ? `border-t ${colors.divider}` : undefined}>
              <a
                href={`${entry.shortUrl}?src=profile-${username}`}
                target="_blank"
                rel="noreferrer"
                className={`focus-ring flex items-center gap-3 px-4 py-3.5 transition-colors ${colors.rowHover}`}
              >
                {locked ? <ProtectedMark /> : <Favicon url={originalUrl} size={20} className="shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${colors.primary}`}>
                    {locked ? protectedTitle(entry) : entry.ogTitle ?? host}
                  </span>
                  {!locked && <span className={`block truncate text-[11px] ${colors.muted}`}>{host}</span>}
                </span>
                {isSpotifyUrl(originalUrl) && (
                  <span className="shrink-0 rounded-full bg-[#1DB954] px-2 py-0.5 text-[10px] font-medium text-white">
                    ▶ Spotify
                  </span>
                )}
                <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} aria-hidden />
              </a>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
