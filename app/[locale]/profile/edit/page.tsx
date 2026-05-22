"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Mail, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { MobilePreviewSheet } from "@/components/mobile-preview-sheet";
import { ProfileSection, type ProfileDraft } from "@/components/profile-section";
import { ProfilePreview } from "@/components/profile-preview";
import { ProfileVisitSummaryCard } from "@/components/profile-visit-summary-card";
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

  // First-time onboarding signal — three concrete milestones the user needs to hit before the
  // page reads as "ready to share". The banner stays until all three are done so the user
  // never wonders "what's next" while editing.
  const steps = {
    username: Boolean(me?.username),
    identity: Boolean(draft.bio?.trim() || draft.avatarUrl),
    firstBlock: draft.entries.length > 0,
  };
  const completedSteps = Object.values(steps).filter(Boolean).length;
  const isOnboarding = ready && authenticated && completedSteps < 3;

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
      {isOnboarding && (
        <div className="rounded-2xl border border-accent-200 bg-accent-50/60 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="flex items-center gap-2 text-xs font-medium text-accent-700">
            <Sparkles className="h-3.5 w-3.5" />
            {t("onboardingEyebrow")}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-headline text-slate-900">
            {t("onboardingTitle")}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
            {t("onboardingSubhead")}
          </p>
          {/* Three-step progress — each step's bullet is filled (●) once detected. The bar
              keeps showing until all three are done so the user has a clear sense of "what's
              next" while editing. Hidden once everything's set so the editor doesn't carry
              residual onboarding noise. */}
          <ol className="mt-4 space-y-2 text-sm">
            <OnboardingStep
              done={steps.username}
              index={1}
              label={t("onboardingStep1")}
              required
            />
            <OnboardingStep
              done={steps.identity}
              index={2}
              label={t("onboardingStep2")}
            />
            <OnboardingStep
              done={steps.firstBlock}
              index={3}
              label={t("onboardingStep3")}
            />
          </ol>
        </div>
      )}

      {/* Prominent CTA to the user's live profile — placed before the title so as soon as the
          editor opens, the owner sees the link they're editing and can one-tap into the public
          view. Hidden until username is claimed (the URL doesn't exist before then). */}
      {me?.username && (
        <ProfilePublicUrlBanner
          url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://kurl.me"}/u/${me.username}`}
          username={me.username}
        />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Heading scale unified with dashboard / stats / leads — text-[24px] mobile up to
              text-[30px] sm+ with tracking-headline, per PR #243/#245 unified hierarchy. The
              earlier text-2xl was a half-step short on desktop and made the editor heading
              visually subordinate to its surrounding cards. */}
          <h1 className="text-[24px] font-semibold leading-tight tracking-headline text-slate-900 sm:text-[30px]">
            {t("title")}
          </h1>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-500">{t("intro")}</p>
        </div>
        {/* Leads 페이지 link 를 *항상* 노출 — 이전엔 EMAIL_FORM block 있을 때만 표시했는데, 폼을
            나중에 추가하는 사용자는 "leads dashboard 자체" 가 어디 있는지 발견 못함 (orphan).
            폼 없을 때는 disabled 톤으로 *비활성* 시각 표시. */}
        <Link
          href={`/${locale}/profile/leads`}
          className={
            "inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-xs font-medium transition " +
            (hasEmailForm
              ? "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              : "border-dashed border-slate-200 text-slate-400 hover:text-slate-600")
          }
          title={hasEmailForm ? undefined : "이메일 폼을 추가하면 리드가 여기 모입니다"}
        >
          <Mail className="h-3.5 w-3.5" />
          {t("leadsLink")}
        </Link>
      </div>

      {/* Visit-stats summary — only renders when the user has claimed a username AND has at
          least one recorded visit. Click-through takes them to /profile/stats for full charts.
          Visit stats are owner-only — the previous public-visibility toggle was removed: there's
          no compelling reason for visitors to see who else came by, and the absence of the
          control keeps owners from worrying about whether their numbers leak. */}
      <ProfileVisitSummaryCard hasUsername={Boolean(me?.username)} />

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

function OnboardingStep({
  done,
  index,
  label,
  required,
}: {
  done: boolean;
  index: number;
  label: string;
  required?: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={
          "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition " +
          (done
            ? "bg-emerald-500 text-white"
            : "border border-accent-300 bg-white text-accent-700")
        }
        aria-hidden
      >
        {done ? <Check className="h-3 w-3" /> : index}
      </span>
      <span className={done ? "text-slate-400 line-through" : "text-slate-700"}>
        {label}
        {required && !done && <span className="ml-1 text-accent-700">*</span>}
      </span>
    </li>
  );
}
