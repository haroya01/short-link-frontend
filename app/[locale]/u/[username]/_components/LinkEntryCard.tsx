import type { CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import { Favicon } from "@/components/favicon";
import type { PublicProfileEntry } from "@/types";
import type { ThemeColors } from "../_lib/theme";
import { hostOf, isImageUrl, isSpotifyUrl, youtubeId } from "../_lib/url-helpers";
import { CardFloatingChip } from "./CardFloatingChip";

type Props = {
  entry: PublicProfileEntry;
  username: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Renders one of four LINK card variants based on the destination URL:
 *
 * <ul>
 *   <li><b>Image</b> — the destination IS the image (URL ends in .jpg/.png/etc). Renders the
 *       image inline as the card body.</li>
 *   <li><b>Highlighted</b> — owner has starred this link AND it has an OG image. Renders a hero
 *       card with the OG image as the top banner + ★ Featured badge.</li>
 *   <li><b>YouTube</b> — destination is a YouTube URL. Renders the thumbnail + play overlay.</li>
 *   <li><b>Generic</b> — fallback. Favicon + title + host. Spotify gets a small green pill.</li>
 * </ul>
 *
 * The fallthrough order matters — image and highlighted both pre-empt YouTube because a hero
 * banner is more visually weighty than a thumbnail.
 */
export function LinkEntryCard({ entry, username, colors, fadeStyle }: Props) {
  const originalUrl = entry.originalUrl ?? "";
  // src=profile-{username} so analytics can split profile-driven clicks from direct kurl.me hits.
  const href = `${entry.shortUrl}?src=profile-${username}`;

  if (isImageUrl(originalUrl)) {
    return (
      <li className="profile-fade" style={fadeStyle}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`profile-card group block overflow-hidden ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={originalUrl}
            alt={entry.ogTitle ?? ""}
            loading="lazy"
            className="block max-h-80 w-full bg-slate-100 object-cover"
          />
          {entry.ogTitle && (
            <div className="px-4 py-3">
              <span className={`block truncate text-[15px] font-semibold tracking-headline ${colors.primary}`}>
                {entry.ogTitle}
              </span>
            </div>
          )}
        </a>
      </li>
    );
  }

  if (entry.highlighted && entry.ogImage) {
    return (
      <li className="profile-fade" style={fadeStyle}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`profile-card group block overflow-hidden ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
        >
          <div
            className="relative aspect-[1.91/1] w-full bg-slate-100"
            style={{
              backgroundImage: `url(${entry.ogImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <CardFloatingChip position="top-left">★ Featured</CardFloatingChip>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Favicon url={originalUrl} size={20} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-base font-semibold ${colors.primary}`}>
                {entry.ogTitle ?? hostOf(originalUrl)}
              </span>
              <span className={`block truncate text-[11px] ${colors.muted}`}>
                {hostOf(originalUrl)}
              </span>
            </span>
            <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
          </div>
        </a>
      </li>
    );
  }

  const ytId = youtubeId(originalUrl);
  if (ytId) {
    return (
      <li className="profile-fade" style={fadeStyle}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`profile-card group block overflow-hidden ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
        >
          <div className="relative aspect-video w-full bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {/* Play overlay sized to match the cross-card "video play" token in AGENTS.md §4
                (h-14 w-14 outer circle, Play h-6 w-6) so the YouTube LINK variant reads as a
                sibling of EmbedEntryCard rather than a smaller off-brand variant. */}
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm">
                <span className="text-xl leading-none translate-x-[1px]">▶</span>
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Favicon url={originalUrl} size={20} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[15px] font-semibold ${colors.primary}`}>
                {entry.ogTitle ?? "YouTube"}
              </span>
              <span className={`block truncate text-[11px] ${colors.muted}`}>youtube.com</span>
            </span>
            <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
          </div>
        </a>
      </li>
    );
  }

  return (
    <li className="profile-fade" style={fadeStyle}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`profile-card group flex items-center gap-3 px-4 py-3.5 ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
      >
        <Favicon url={originalUrl} size={20} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium ${colors.primary}`}>
            {entry.ogTitle ?? hostOf(originalUrl)}
          </span>
          <span className={`block truncate text-[11px] ${colors.muted}`}>
            {hostOf(originalUrl)}
          </span>
        </span>
        {isSpotifyUrl(originalUrl) && (
          <span className="shrink-0 rounded-full bg-[#1DB954] px-2 py-0.5 text-[10px] font-medium text-white">
            ▶ Spotify
          </span>
        )}
        <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
      </a>
    </li>
  );
}
