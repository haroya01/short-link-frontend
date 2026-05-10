import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Favicon } from "@/components/favicon";
import { ProfileOwnerFab } from "@/components/profile-owner-fab";
import { ProfileShareFab } from "@/components/profile-share-fab";
import type { ProfileTheme, PublicProfile } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

type ThemeColors = {
  page: string;
  card: string;
  cardBorder: string;
  cardHover: string;
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
    cardHover: "hover:border-slate-300 hover:bg-slate-50",
    primary: "text-slate-900",
    muted: "text-slate-500",
    avatar: "bg-slate-900",
    avatarText: "text-white",
  },
  light: {
    page: "bg-slate-50",
    card: "bg-white",
    cardBorder: "border-slate-200",
    cardHover: "hover:border-slate-300 hover:bg-slate-50",
    primary: "text-slate-900",
    muted: "text-slate-500",
    avatar: "bg-slate-900",
    avatarText: "text-white",
  },
  dark: {
    page: "bg-slate-950",
    card: "bg-slate-900",
    cardBorder: "border-slate-800",
    cardHover: "hover:border-slate-700 hover:bg-slate-800",
    primary: "text-slate-100",
    muted: "text-slate-400",
    avatar: "bg-slate-100",
    avatarText: "text-slate-900",
  },
  accent: {
    page: "bg-gradient-to-b from-accent-50 to-white",
    card: "bg-white",
    cardBorder: "border-accent-200",
    cardHover: "hover:border-accent-300 hover:bg-accent-50/50",
    primary: "text-slate-900",
    muted: "text-slate-600",
    avatar: "bg-accent-600",
    avatarText: "text-white",
  },
};

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  // Short revalidate so owner edits show up within ~30s without smashing the backend per visit.
  // The backend layers a 5min Redis cache that auto-evicts on profile/toggle/reorder writes.
  const res = await fetch(`${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}`, {
    next: { revalidate: 30 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("profile fetch failed");
  return (await res.json()) as PublicProfile;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username).catch(() => null);
  if (!profile) return { title: `@${username}` };
  return {
    title: `@${profile.username} · kurl`,
    description: profile.bio ?? `${profile.links.length} links`,
    openGraph: {
      title: `@${profile.username} · kurl`,
      description: profile.bio ?? undefined,
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const t = await getTranslations({ locale, namespace: "publicProfile" });
  const profile = await fetchProfile(username);
  if (!profile) notFound();

  const initial = (profile.username[0] ?? "·").toUpperCase();
  const colors = THEME_TABLE[profile.theme ?? "default"];

  return (
    <div className={`min-h-screen ${colors.page}`}>
      <div className="container max-w-md py-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={`grid h-20 w-20 place-items-center rounded-full text-2xl font-semibold shadow-sm ${colors.avatar} ${colors.avatarText}`}
          >
            {initial}
          </div>
          <p className={`text-sm font-medium ${colors.primary}`}>@{profile.username}</p>
          {profile.bio && (
            <p className={`text-sm leading-relaxed ${colors.muted}`}>{profile.bio}</p>
          )}
        </div>

        <ul className="mt-8 space-y-2.5">
          {profile.links.length === 0 ? (
            <li
              className={`rounded-xl border border-dashed ${colors.cardBorder} p-6 text-center text-xs ${colors.muted}`}
            >
              {t("empty")}
            </li>
          ) : (
            profile.links.map((link) => {
              const ytId = youtubeId(link.originalUrl);
              const href = `${link.shortUrl}?src=profile-${profile.username}`;
              if (link.highlighted && link.ogImage) {
                return (
                  <li key={link.shortCode}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className={`hover-lift group block overflow-hidden rounded-xl border ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
                    >
                      <div
                        className="relative aspect-[1.91/1] w-full bg-slate-100"
                        style={{
                          backgroundImage: `url(${link.ogImage})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                          ★ Featured
                        </span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3.5">
                        <Favicon url={link.originalUrl} size={20} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-base font-semibold ${colors.primary}`}>
                            {link.ogTitle ?? hostOf(link.originalUrl)}
                          </span>
                          <span className={`block truncate text-[11px] ${colors.muted}`}>
                            {hostOf(link.originalUrl)}
                          </span>
                        </span>
                        <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
                      </div>
                    </a>
                  </li>
                );
              }
              if (ytId) {
                return (
                  <li key={link.shortCode}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className={`hover-lift group block overflow-hidden rounded-xl border ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
                    >
                      <div className="relative aspect-video w-full bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm">
                            ▶
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Favicon url={link.originalUrl} size={20} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-medium ${colors.primary}`}>
                            {link.ogTitle ?? "YouTube"}
                          </span>
                          <span className={`block truncate text-[11px] ${colors.muted}`}>
                            youtube.com
                          </span>
                        </span>
                        <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
                      </div>
                    </a>
                  </li>
                );
              }
              return (
                <li key={link.shortCode}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className={`hover-lift group flex items-center gap-3 rounded-xl border px-4 py-3.5 ${colors.card} ${colors.cardBorder} ${colors.cardHover}`}
                  >
                    <Favicon url={link.originalUrl} size={20} className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-medium ${colors.primary}`}>
                        {link.ogTitle ?? hostOf(link.originalUrl)}
                      </span>
                      <span className={`block truncate text-[11px] ${colors.muted}`}>
                        {hostOf(link.originalUrl)}
                      </span>
                    </span>
                    <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${colors.muted}`} />
                  </a>
                </li>
              );
            })
          )}
        </ul>

        <p className={`mt-10 text-center text-[11px] ${colors.muted}`}>{t("madeWith")}</p>
      </div>
      <ProfileShareFab
        url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://kurl.me"}/u/${profile.username}`}
        filename={`${profile.username}.png`}
      />
      <ProfileOwnerFab username={profile.username} />
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

/**
 * Extract a YouTube video ID from any of the common URL shapes (watch, youtu.be, shorts, embed).
 * Returns null for non-YouTube URLs so callers can fall back to the generic link card.
 */
function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host !== "youtube.com" && host !== "m.youtube.com") return null;
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const shorts = u.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts) return shorts[1];
    const embed = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
    if (embed) return embed[1];
    return null;
  } catch {
    return null;
  }
}
