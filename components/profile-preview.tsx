"use client";

import { BatteryFull, ExternalLink, Signal, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MyLink, ProfileTheme, Social } from "@/types";
import { ChannelIcon } from "@/app/[locale]/u/[username]/_components/ShareRow";

type ThemeColors = {
  page: string;
  card: string;
  cardBorder: string;
  primary: string;
  muted: string;
  avatar: string;
  avatarText: string;
};

const THEME_TABLE: Record<ProfileTheme | "default", ThemeColors> = {
  default: {
    page: "bg-white",
    card: "bg-white",
    cardBorder: "border-slate-200",
    primary: "text-slate-900",
    muted: "text-slate-500",
    avatar: "bg-slate-900",
    avatarText: "text-white",
  },
  light: {
    page: "bg-slate-50",
    card: "bg-white",
    cardBorder: "border-slate-200",
    primary: "text-slate-900",
    muted: "text-slate-500",
    avatar: "bg-slate-900",
    avatarText: "text-white",
  },
  dark: {
    page: "bg-slate-950",
    card: "bg-slate-900",
    cardBorder: "border-slate-800",
    primary: "text-slate-100",
    muted: "text-slate-400",
    avatar: "bg-slate-100",
    avatarText: "text-slate-900",
  },
  accent: {
    page: "bg-gradient-to-b from-accent-50 to-white",
    card: "bg-white",
    cardBorder: "border-accent-200",
    primary: "text-slate-900",
    muted: "text-slate-600",
    avatar: "bg-accent-600",
    avatarText: "text-white",
  },
  sunset: {
    page: "bg-gradient-to-b from-orange-100 via-rose-50 to-amber-50",
    card: "bg-white/90",
    cardBorder: "border-rose-200",
    primary: "text-slate-900",
    muted: "text-rose-900/70",
    avatar: "bg-gradient-to-br from-orange-400 to-rose-500",
    avatarText: "text-white",
  },
  ocean: {
    page: "bg-gradient-to-b from-sky-100 via-cyan-50 to-blue-50",
    card: "bg-white/90",
    cardBorder: "border-sky-200",
    primary: "text-slate-900",
    muted: "text-sky-900/70",
    avatar: "bg-gradient-to-br from-cyan-500 to-sky-600",
    avatarText: "text-white",
  },
  forest: {
    page: "bg-gradient-to-b from-emerald-100 via-green-50 to-teal-50",
    card: "bg-white/90",
    cardBorder: "border-emerald-200",
    primary: "text-slate-900",
    muted: "text-emerald-900/70",
    avatar: "bg-gradient-to-br from-emerald-500 to-teal-600",
    avatarText: "text-white",
  },
  mono: {
    page: "bg-white",
    card: "bg-white",
    cardBorder: "border-2 border-black",
    primary: "text-black",
    muted: "text-slate-700",
    avatar: "bg-black",
    avatarText: "text-white",
  },
  neon: {
    page: "bg-slate-950",
    card: "bg-slate-900/80",
    cardBorder: "border border-fuchsia-500/40",
    primary: "text-fuchsia-100",
    muted: "text-fuchsia-300/70",
    avatar: "bg-gradient-to-br from-fuchsia-500 to-cyan-400",
    avatarText: "text-slate-950",
  },
  aurora: {
    page: "theme-aurora-anim",
    card: "bg-white/85",
    cardBorder: "border border-violet-200",
    primary: "text-slate-900",
    muted: "text-slate-600",
    avatar: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    avatarText: "text-white",
  },
};

type Props = {
  username: string;
  bio: string;
  theme: ProfileTheme | null;
  /** Saved avatar URL — when null, the preview falls back to the username initial. */
  avatarUrl: string | null;
  /** Saved banner URL — when null, the avatar sits standalone above the handle. */
  bannerUrl: string | null;
  /** Ordered short codes that appear on the profile. */
  featuredShortCodes: string[];
  /** All of the user's links — used to look up url + originalUrl per featured code. */
  links: MyLink[];
  /** Channel + URL pairs to render as a mini share row at the bottom of the preview. */
  socials: Social[];
  /**
   * Per-shortCode label override. When present, the link row shows the user's typed label
   * ("📝 Blog") instead of the bare hostname — same precedence the public profile uses.
   */
  labelByShortCode: Record<string, string>;
};

/**
 * Renders the public profile layout with the editor's local draft state — never hits the
 * network. Mirrors the production page (`/u/{username}`) closely enough that what the user sees
 * on the right side equals what visitors will see, but it's a phone-frame preview to make the
 * "share to bio" intent obvious.
 */
export function ProfilePreview({
  username,
  bio,
  theme,
  avatarUrl,
  bannerUrl,
  featuredShortCodes,
  links,
  socials,
  labelByShortCode,
}: Props) {
  const t = useTranslations("publicProfile");
  const tEditor = useTranslations("settings.profile");
  const colors = THEME_TABLE[theme ?? "default"];
  const initial = (username || "·")[0]?.toUpperCase() ?? "·";
  const featured = featuredShortCodes
    .map((code) => links.find((l) => l.shortCode === code))
    .filter((l): l is MyLink => Boolean(l));

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-slate-500">{tEditor("previewTitle")}</p>
      <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[42px] border border-slate-800/30 bg-slate-900 p-1.5 shadow-xl shadow-slate-300/40">
        {/* Dynamic-Island style notch */}
        <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
        <div
          className={`relative aspect-[390/844] overflow-hidden overflow-y-auto rounded-[34px] ${colors.page}`}
        >
          {/* iOS-style status bar — sits above the content; keeps the same color tokens so the
              text stays legible on light/dark/animated themes alike. */}
          <div
            className={`pointer-events-none sticky top-0 z-10 flex items-center justify-between px-7 pt-2 pb-1 text-[9px] font-semibold ${colors.primary}`}
          >
            <span>9:41</span>
            <div className="flex items-center gap-0.5 opacity-80">
              <Signal className="h-2.5 w-2.5" />
              <Wifi className="h-2.5 w-2.5" />
              <BatteryFull className="h-2.5 w-2.5" />
            </div>
          </div>
          {bannerUrl && (
            <div className="aspect-[3/1] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className={`space-y-3 px-4 pb-8 ${bannerUrl ? "pt-2" : "pt-3"}`}>
            <div className="flex flex-col items-center gap-2 text-center">
              {avatarUrl ? (
                <div
                  className={
                    "h-14 w-14 overflow-hidden rounded-full ring-2 " +
                    (bannerUrl ? "-mt-9 ring-white/95" : "ring-transparent")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div
                  className={
                    "grid h-14 w-14 place-items-center rounded-full text-lg font-semibold ring-2 " +
                    (bannerUrl ? "-mt-9 ring-white/95 " : "ring-transparent ") +
                    `${colors.avatar} ${colors.avatarText}`
                  }
                >
                  {initial}
                </div>
              )}
              <p className={`font-mono text-xs ${colors.primary}`}>
                @{username || tEditor("previewUsernamePlaceholder")}
              </p>
              {bio ? (
                <p className={`text-[11px] leading-snug ${colors.muted}`}>{bio}</p>
              ) : (
                <p className={`text-[11px] italic leading-snug ${colors.muted}`}>
                  {tEditor("previewBioPlaceholder")}
                </p>
              )}
            </div>

            <ul className="space-y-1.5">
              {featured.length === 0 ? (
                <li
                  className={`rounded-md border border-dashed px-3 py-4 text-center text-[10px] ${colors.cardBorder} ${colors.muted}`}
                >
                  {t("empty")}
                </li>
              ) : (
                featured.map((link) => {
                  const label = labelByShortCode[link.shortCode];
                  return (
                    <li
                      key={link.shortCode}
                      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${colors.card} ${colors.cardBorder}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-[11px] font-medium ${colors.primary}`}>
                          {label || hostOf(link.originalUrl)}
                        </span>
                        <span className={`block truncate text-[10px] ${colors.muted}`}>
                          {label ? hostOf(link.originalUrl) : `/${link.shortCode}`}
                        </span>
                      </span>
                      <ExternalLink className={`h-3 w-3 shrink-0 ${colors.muted}`} />
                    </li>
                  );
                })
              )}
            </ul>
            {(socials.length > 0 || featured.length > 0) && (
              // Mini share row — mirrors the public profile's ShareRow visually. URL-less chips
              // still show up so the user can preview chip placement while drafting the URL.
              <div className="mt-3 flex items-center justify-center gap-1">
                {socials.map((s) => (
                  <span
                    key={s.channel}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${colors.cardBorder} ${colors.card}`}
                  >
                    <ChannelIcon channel={s.channel} className={`h-2.5 w-2.5 ${colors.muted}`} />
                  </span>
                ))}
              </div>
            )}
            {/* Home indicator */}
            <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-slate-300/60" />
          </div>
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-400">
        kurl.me/u/{username || "..."}
      </p>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
