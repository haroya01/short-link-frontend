"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { MobilePreviewSheet } from "@/components/mobile-preview-sheet";
import { ProfileSection, type ProfileDraft } from "@/components/profile-section";
import { ProfilePreview } from "@/components/profile-preview";

export default function ProfileEditPage() {
  const t = useTranslations("settings.profile");
  const router = useRouter();
  const locale = useLocale();
  const { authenticated, ready } = useAuth();
  const [draft, setDraft] = useState<ProfileDraft>({
    username: "",
    bio: "",
    theme: null,
    avatarUrl: null,
    bannerUrl: null,
    socials: [],
    featured: [],
    links: [],
    labelByShortCode: {},
  });

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

  return (
    <div className="container max-w-5xl space-y-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("intro")}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <ProfileSection onDraft={handleDraft} />
        </div>
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <ProfilePreview
            username={draft.username}
            bio={draft.bio}
            theme={draft.theme}
            avatarUrl={draft.avatarUrl}
            bannerUrl={draft.bannerUrl}
            featuredShortCodes={draft.featured}
            links={draft.links}
            socials={draft.socials}
            labelByShortCode={draft.labelByShortCode}
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
          featuredShortCodes={draft.featured}
          links={draft.links}
          socials={draft.socials}
          labelByShortCode={draft.labelByShortCode}
        />
      </MobilePreviewSheet>
    </div>
  );
}
