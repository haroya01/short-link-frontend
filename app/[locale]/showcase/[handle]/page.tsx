import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { EntryList } from "@/app/[locale]/u/[username]/_components/EntryList";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/ProfileHeader";
import { ShareRow } from "@/app/[locale]/u/[username]/_components/ShareRow";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
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
  if (!profile) return { title: `${handle} · kurl 예시` };
  const t = await getTranslations({ locale, namespace: "showcase" });
  return {
    // Marketing demo pages — clearly labeled as 예시 so they don't compete with real
    // /u/<handle> profiles for the same handle in Google.
    title: `${profile.username} (${t("metaSuffix")}) · kurl`,
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
      {/* Sample banner — keep it small and dismissible-looking so it doesn't bury the demo, but
          explicit enough that visitors don't think this is a real user's page. */}
      <div className="sticky top-0 z-30 border-b border-amber-200/60 bg-amber-50/80 backdrop-blur">
        <div className="container flex max-w-md items-center justify-between gap-3 py-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-amber-900">
            <Sparkles className="h-3 w-3" />
            {t("sampleBanner")}
          </span>
          <Link
            href="/login?next=/profile/auto"
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-slate-800"
          >
            {t("sampleCta")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {profile.bannerUrl && (
        <div
          className="aspect-[3/1] w-full overflow-hidden sm:aspect-[4/1] md:aspect-[5/1]"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className={`container max-w-md ${profile.bannerUrl ? "-mt-12 pb-12" : "py-12"}`}>
        <ProfileHeader
          username={profile.username}
          bio={profile.bio}
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          colors={colors}
          bannerInline={false}
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
        <p className={`mt-6 text-center text-[11px] ${colors.muted}`}>{tPub("madeWith")}</p>
      </div>
    </div>
  );
}
