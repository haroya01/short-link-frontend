"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SignInLink } from "@/components/auth/sign-in-link";
import { buttonVariants } from "@/components/ui/button";
import { PromoActions, PromoHero, PromoSection } from "@/components/landing/promo";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { EntryList } from "@/app/[locale]/u/[username]/_components/entry-list";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/profile-header";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { cn, inert } from "@/lib/utils";

const FIRST = SHOWCASE_PROFILES.find((p) => p.username === "haruka.dev") ?? SHOWCASE_PROFILES[0];
/** The signed-out profile page: the shared feature-page grammar around the examples below. */
export function ShowcaseLanding() {
  const t = useTranslations("showcase");
  return (
    <div className="bg-white dark:bg-slate-950">
      <PromoHero
        title={t("ctaTitle")}
        lead={t("ctaSubhead")}
        action={
          <SignInLink reason="profile" next="/profile/auto" className={buttonVariants({ variant: "accent", size: "xl" })}>
            {t("cta")}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </SignInLink>
        }
      />
      <PromoSection title={t("title")} desc={t("subhead")}>
        <ProfileShowcase />
        <PromoActions>
          <SignInLink reason="profile" next="/profile/auto" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t("cta")}
          </SignInLink>
        </PromoActions>
      </PromoSection>
    </div>
  );
}

/**
 * Profile examples: a hairline list of example pages beside the chosen one, drawn with the real
 * {@link ProfileHeader} + {@link EntryList} at phone width. The window scrolls on its own; nothing is
 * scaled down, faded or cut off to fit, and nothing moves by itself.
 */
export function ProfileShowcase() {
  const t = useTranslations("showcase");
  const [selected, setSelected] = useState(FIRST.username);
  const profile = SHOWCASE_PROFILES.find((p) => p.username === selected) ?? FIRST;
  const colors = THEME_TABLE[profile.theme ?? "default"];

  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_26.75rem] lg:gap-12">
      {/* 폰에선 창이 목록 아래로 밀려 고른 결과가 화면 밖에 뜬다 — 창 바로 위 가로 한 줄로 고른다. */}
      <div className="-mx-4 overflow-x-auto px-4 lg:hidden">
        <div className="flex w-max gap-5 border-b border-slate-200 dark:border-slate-800">
          {SHOWCASE_PROFILES.map((p) => {
            const active = p.username === selected;
            return (
              <button
                key={p.username}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(p.username)}
                className={cn(
                  "focus-ring -mb-px whitespace-nowrap border-b-2 py-2.5 text-[14px] font-semibold transition-colors",
                  active
                    ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                    : "border-transparent text-slate-500 dark:text-slate-400",
                )}
              >
                @{p.username}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="hidden divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800 lg:block lg:self-start">
        {SHOWCASE_PROFILES.map((p) => {
          const active = p.username === selected;
          return (
            <li key={p.username} className="flex items-center gap-4">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(p.username)}
                className="focus-ring group min-w-0 flex-1 rounded-sm py-4 text-left"
              >
                <span
                  className={cn(
                    "block text-[15px] font-semibold transition-colors",
                    active
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100",
                  )}
                >
                  @{p.username}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-slate-500 dark:text-slate-400">{p.bio}</span>
              </button>
              <Link
                href={`/showcase/${p.username}`}
                aria-label={`@${p.username} ${t("demoCta")}`}
                className={cn(
                  "focus-ring inline-flex shrink-0 items-center gap-1 rounded-sm text-[13px] font-medium underline-offset-4 hover:underline",
                  active ? "text-accent-700 dark:text-accent-400" : "text-slate-500 dark:text-slate-400",
                )}
              >
                {t("demoCta")}
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div
        key={profile.username}
        role="region"
        tabIndex={0}
        aria-label={`@${profile.username} ${t("metaSuffix")}`}
        className={cn(
          "focus-ring h-[36rem] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 dark:border-slate-800 sm:h-[42rem]",
          colors.page,
        )}
        style={colors.pageBgHex ? { backgroundColor: colors.pageBgHex } : undefined}
      >
        <div aria-hidden {...inert(true)} className="select-none">
          <div className="mx-auto w-full max-w-md px-4 py-10">
            <ProfileHeader
              headingLevel="h3"
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
              emptyLabel=""
            />
          </div>
        </div>
      </div>

      <Link
        href={`/showcase/${profile.username}`}
        className="focus-ring inline-flex items-center gap-1 justify-self-start rounded-sm text-[14px] font-medium text-accent-700 underline-offset-4 hover:underline dark:text-accent-400 lg:hidden"
      >
        @{profile.username} {t("demoCta")}
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
