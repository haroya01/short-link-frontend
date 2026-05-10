import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Favicon } from "@/components/favicon";
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
  const res = await fetch(`${API_BASE}/api/v1/public/profiles/${encodeURIComponent(username)}`, {
    next: { revalidate: 300 },
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
            profile.links.map((link) => (
              <li key={link.shortCode}>
                <a
                  href={`${link.shortUrl}?src=profile-${profile.username}`}
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
            ))
          )}
        </ul>

        <p className={`mt-10 text-center text-[11px] ${colors.muted}`}>{t("madeWith")}</p>
      </div>
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
