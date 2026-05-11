import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileOwnerFab } from "@/components/profile-owner-fab";
import { ProfileShareFab } from "@/components/profile-share-fab";
import type { PublicProfile } from "@/types";
import { EntryList } from "./_components/EntryList";
import { ProfileHeader } from "./_components/ProfileHeader";
import { ShareRow } from "./_components/ShareRow";
import { THEME_TABLE } from "./_lib/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

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
  const entries = profile.entries ?? [];
  return {
    title: `@${profile.username} · kurl`,
    description: profile.bio ?? `${entries.filter((e) => e.kind === "LINK").length} links`,
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
  // Old-handle redirect: backend resolves the requested handle through history within the
  // 30d grace window, returning the current owner. Surface it as a 308 to the canonical URL
  // so old SNS bio links keep working without leaving stale handles in browser address bars.
  if (profile.username.toLowerCase() !== username.toLowerCase()) {
    redirect(`/${locale}/u/${profile.username}`);
  }

  const colors = THEME_TABLE[profile.theme ?? "default"];

  return (
    <div className={`min-h-screen ${colors.page}`}>
      <div className="container max-w-md py-12">
        <ProfileHeader
          username={profile.username}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          colors={colors}
        />
        <EntryList
          entries={profile.entries ?? []}
          username={profile.username}
          colors={colors}
          emptyLabel={t("empty")}
        />
        <ShareRow
          url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.kurl.me"}/u/${profile.username}`}
          username={profile.username}
          colors={colors}
          socials={profile.socials ?? []}
          labels={{
            visitOn: {
              x: t("visit.x"),
              line: t("visit.line"),
              threads: t("visit.threads"),
              facebook: t("visit.facebook"),
              kakao: t("visit.kakao"),
            },
            shareMore: t("share.more"),
            copy: t("share.copy"),
            copied: t("share.copied"),
          }}
        />
        <p className={`mt-6 text-center text-[11px] ${colors.muted}`}>{t("madeWith")}</p>
      </div>
      <ProfileShareFab
        url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://kurl.me"}/u/${profile.username}`}
        filename={`${profile.username}.png`}
      />
      <ProfileOwnerFab username={profile.username} />
    </div>
  );
}
