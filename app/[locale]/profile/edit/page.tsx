"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { MobilePreviewSheet } from "@/components/mobile-preview-sheet";
import { ProfileSection, type ProfileDraft } from "@/components/profile-section";
import { ProfilePreview } from "@/components/profile-preview";
import { ProfileVisitSummaryCard } from "@/components/profile-visit-summary-card";
import { ProfileStatsVisibilityToggle } from "@/components/profile-stats-visibility-toggle";
import { ProfilePublicUrlBanner } from "@/components/profile-public-url-banner";

export default function ProfileEditPage() {
  const t = useTranslations("settings.profile");
  const router = useRouter();
  const locale = useLocale();
  const { authenticated, ready, me } = useAuth();
  const [draft, setDraft] = useState<ProfileDraft>({
    username: "",
    bio: "",
    theme: null,
    avatarUrl: null,
    bannerUrl: null,
    socials: [],
    entries: [],
  });

  // First-time onboarding signal: the signed-in user hasn't claimed a username yet. Drives a
  // welcome banner + the "give your profile a name first" emphasis so new sellers aren't
  // dropped into an empty editor without context.
  const isNewProfile = ready && authenticated && !me?.username;

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [ready, authenticated, locale, router]);

  // Stable callback so the editor's effect dependency doesn't churn on every render.
  const handleDraft = useCallback((next: ProfileDraft) => setDraft(next), []);

  if (!ready || !authenticated) {
    return <div className="container max-w-2xl py-16 text-sm text-slate-500">…</div>;
  }

  const hasEmailForm = draft.entries.some((e) => e.kind === "EMAIL_FORM");

  return (
    <div className="container max-w-5xl space-y-6 py-12">
      {isNewProfile && (
        <div className="rounded-lg border border-accent-200 bg-accent-50/60 p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-accent-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("onboardingEyebrow")}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            {t("onboardingTitle")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {t("onboardingSubhead")}
          </p>
        </div>
      )}

      {/* Prominent CTA to the user's live profile — placed before the title so as soon as the
          editor opens, the owner sees the link they're editing and can one-tap into the public
          view. Hidden until username is claimed (the URL doesn't exist before then). */}
      {me?.username && (
        <ProfilePublicUrlBanner
          url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://kurl.me"}/u/${me.username}`}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("intro")}</p>
        </div>
        {/* Only surface the leads link when there's at least one EMAIL_FORM block on the
            profile — keeps the header clean for sellers who aren't collecting emails. The page
            was previously orphan (no nav entry anywhere), so sellers who built a form often
            didn't know the dashboard existed. */}
        {hasEmailForm && (
          <Link
            href={`/${locale}/profile/leads`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Mail className="h-3.5 w-3.5" />
            {t("leadsLink")}
          </Link>
        )}
      </div>

      {/* Visit-stats summary — only renders when the user has claimed a username AND has at
          least one recorded visit. Click-through takes them to /profile/stats for full charts. */}
      <ProfileVisitSummaryCard hasUsername={Boolean(me?.username)} />

      {/* Opt-in switch for /u/<username>/stats public visibility. Sits below the numbers card
          so the decision is anchored next to the data it'd expose. */}
      <ProfileStatsVisibilityToggle hasUsername={Boolean(me?.username)} />

      {/*
        `minmax(0, 1fr)` (not bare `1fr`, which is `minmax(auto, 1fr)`) is what caps the left
        track — a long indivisible URL inside the feed list would otherwise expand min-content
        past 1fr and squeeze the 320px preview / stretch the theme picker. `min-w-0` on the
        wrapper backstops nested flex containers whose children rely on truncation.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <ProfileSection onDraft={handleDraft} />
        </div>
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <ProfilePreview
            username={draft.username}
            bio={draft.bio}
            theme={draft.theme}
            avatarUrl={draft.avatarUrl}
            bannerUrl={draft.bannerUrl}
            socials={draft.socials}
            entries={draft.entries}
          />
        </aside>
      </div>

      <MobilePreviewSheet>
        <ProfilePreview
          username={draft.username}
          bio={draft.bio}
          theme={draft.theme}
          avatarUrl={draft.avatarUrl}
          bannerUrl={draft.bannerUrl}
          socials={draft.socials}
          entries={draft.entries}
        />
      </MobilePreviewSheet>
    </div>
  );
}
