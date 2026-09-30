import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Favicon } from "@/components/common/favicon";
import type { PublicProfileEntry } from "@/types";
import type { ThemeColors } from "../_lib/theme";
import { hostOf, isImageUrl, youtubeId } from "../_lib/url-helpers";

type Props = {
  entry: PublicProfileEntry;
  username: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

function coverOf(entry: PublicProfileEntry, url: string): string | null {
  if (entry.ogImage) return entry.ogImage;
  const ytId = youtubeId(url);
  if (ytId) return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  if (isImageUrl(url)) return url;
  return null;
}

/** 주인이 고른 대표 링크 하나 — 바이오 링크로 들어온 방문자가 가장 먼저 보는 자리. */
export function FeaturedLink({ entry, username, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile");
  const originalUrl = entry.originalUrl ?? "";
  const href = `${entry.shortUrl}?src=profile-${username}`;
  const cover = coverOf(entry, originalUrl);
  const host = hostOf(originalUrl);

  return (
    <li className="profile-fade" style={fadeStyle}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`profile-card group block overflow-hidden ${colors.card} ${colors.accentBorder} ${colors.cardHover}`}
      >
        {cover && (
          <div className="aspect-[1.91/1] w-full bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" loading="eager" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="px-4 py-4">
          <p className={`text-[12px] font-medium ${colors.accentText}`}>{t("featured")}</p>
          <p className={`mt-1 text-[17px] font-semibold leading-snug tracking-headline ${colors.primary}`}>
            {entry.ogTitle ?? host}
          </p>
          <p className={`mt-1.5 flex items-center gap-1.5 text-[12px] ${colors.muted}`}>
            <Favicon url={originalUrl} size={14} className="shrink-0" />
            <span className="truncate">{host}</span>
          </p>
        </div>
      </a>
    </li>
  );
}
