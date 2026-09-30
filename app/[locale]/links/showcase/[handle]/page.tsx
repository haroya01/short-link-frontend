import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { EntryList } from "@/app/[locale]/u/[username]/_components/entry-list";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/profile-header";
import { ShareRow } from "@/app/[locale]/u/[username]/_components/share-row";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { MadeWithKurl } from "@/components/common/made-with-kurl";
import { Link } from "@/i18n/navigation";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_FRONTEND_URL ??
  "https://kurl.me";

export async function generateStaticParams() {
  return SHOWCASE_PROFILES.map((p) => ({ handle: p.username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}): Promise<Metadata> {
  const { locale, handle } = await params;
  const profile = SHOWCASE_PROFILES.find((p) => p.username === handle);
  const t = await getTranslations({ locale, namespace: "showcase" });
  if (!profile) return { title: t("metaFallbackTitle", { handle }) };
  return {
    // Marketing demo pages — clearly labeled as 예시 so they don't compete with real
    // /u/<handle> profiles for the same handle in Google.
    title: `${profile.username} (${t("metaSuffix")})`,
    description: profile.bio ?? undefined,
    robots: { index: true, follow: true },
    alternates: { canonical: `${SITE_URL}/${locale}/showcase/${profile.username}` },
  };
}

/**
 * Showcase profile demo. Renders one fixture from the landing carousel as a full-screen public
 * profile — identical to {@code /u/[username]/page.tsx} but pinned to fixture data and labeled
 * with a "this is a sample" banner. Lets visitors see exactly what the page would look like at
 * actual phone-viewport size before they sign up. /demo (analytics dashboard) used to be the
 * landing-page click target which was the wrong context — visitors clicking a profile card
 * expect to see a profile, not a stats dashboard.
 */
export default async function ShowcaseHandlePage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const profile = SHOWCASE_PROFILES.find((p) => p.username === handle);
  if (!profile) notFound();

  const tPub = await getTranslations({ locale, namespace: "publicProfile" });
  const t = await getTranslations({ locale, namespace: "showcase" });
  const colors = THEME_TABLE[profile.theme ?? "default"];

  return (
    <div className={`min-h-screen ${colors.page}`}>
      {/* Sample banner — small enough not to bury the demo, explicit enough that visitors don't
          take this for a real user's page. */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="container flex max-w-md items-center justify-between gap-3 py-2 text-[12px]">
          <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-300">{t("sampleBanner")}</span>
          <Link
            href="/login?next=/profile/auto"
            className="focus-ring inline-flex min-h-8 shrink-0 items-center gap-1 rounded font-medium text-accent-700 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
          >
            {t("sampleCta")}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="container max-w-md py-10">
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
          emptyLabel={tPub("empty")}
        />
        <ShareRow
          url={`${SITE_URL}/${locale}/showcase/${profile.username}`}
          username={profile.username}
          colors={colors}
          socials={profile.socials ?? []}
          labels={{
            visitOn: {
              x: tPub("visit.x"),
              line: tPub("visit.line"),
              threads: tPub("visit.threads"),
              facebook: tPub("visit.facebook"),
              kakao: tPub("visit.kakao"),
              instagram: tPub("visit.instagram"),
              linkedin: tPub("visit.linkedin"),
            },
            shareMore: tPub("share.more"),
            copy: tPub("share.copy"),
            copied: tPub("share.copied"),
          }}
        />
        <div className="mt-6 flex justify-center">
          <MadeWithKurl tone={{ text: colors.muted, strong: colors.primary, border: colors.cardBorder }} />
        </div>
      </div>
    </div>
  );
}
