"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { SignInLink } from "@/components/auth/sign-in-link";
import { inert } from "@/lib/utils";
import type { ContactField, EventAnalytics, PublicEvent } from "@/modules/events/api/events";
import { AnalyticsPanel } from "./analytics-panel";
import { EventPageView } from "./event-page-view";

const DAY_MS = 86_400_000;

function exampleNow(): number {
  const built = Date.parse(`${process.env.NEXT_PUBLIC_BUILD_DATE ?? ""}T10:00:00Z`);
  return Number.isNaN(built) ? Date.UTC(2026, 8, 28, 10) : built;
}

const CONTACT: Record<string, ContactField> = { ko: "KAKAO", ja: "LINE" };

export function EventsIntro() {
  const t = useTranslations("events.intro");
  const tDemo = useTranslations("events.intro.demo");
  const locale = useLocale();
  const now = exampleNow();

  const event = useMemo<PublicEvent>(() => {
    const start = now + 9 * DAY_MS;
    return {
      slug: "example",
      title: tDemo("eventTitle"),
      descriptionMd: null,
      coverImageUrl: null,
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(start + 2 * 3_600_000).toISOString(),
      timezone: locale === "ja" ? "Asia/Tokyo" : "Asia/Seoul",
      locationText: tDemo("eventPlace"),
      locationUrl: null,
      onlineUrl: null,
      capacity: 20,
      spotsLeft: 13,
      closeAt: null,
      contactField: CONTACT[locale] ?? "EMAIL",
      status: "OPEN",
      acceptingRegistrations: true,
      attending: 7,
      organizerName: tDemo("hostName"),
      organizerAvatarUrl: null,
      questions: [{ id: 1, type: "SHORT_TEXT", label: tDemo("question"), options: [], required: false }],
    };
  }, [tDemo, locale, now]);

  const analytics = useMemo<EventAnalytics>(() => {
    const channels = [tDemo("channels.groupChat"), tDemo("channels.instagram"), tDemo("channels.qrPoster")];
    return {
      totalClicks: 58,
      totalRegistrations: 7,
      registrationsByChannel: [4, 2, 1].map((count, i) => ({ key: channels[i], count })),
      clicksByLink: [31, 19, 8].map((count, i) => ({ key: channels[i], count })),
      clicksByClientApp: [
        { key: "KakaoTalk", count: 29 },
        { key: "Instagram", count: 18 },
        { key: "Safari", count: 11 },
      ],
      dailyRegistrations: [],
    };
  }, [tDemo]);

  return (
    <div className="bg-white dark:bg-slate-950">
      <div className="container max-w-5xl">
        <header className="pb-12 pt-12 sm:pb-14 sm:pt-16">
          <h1 className="text-balance break-keep text-headline-sm font-bold tracking-headline text-slate-900 dark:text-slate-100 sm:text-headline-md">
            {t("title")}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <SignInLink reason="events" next="/events/new" className={buttonVariants({ size: "lg" })}>
              {t("ctaLogin")}
            </SignInLink>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">{t("ctaHint")}</p>
          </div>
        </header>

        <Band label={t("example.guest")}>
          <EventPageView
            event={event}
            now={now}
            heading="h2"
            preview
            description={
              <>
                <p>{tDemo("about")}</p>
                <ul>
                  <li>{tDemo("note1")}</li>
                  <li>{tDemo("note2")}</li>
                </ul>
              </>
            }
          />
        </Band>

        <Band label={t("example.host")}>
          <AnalyticsPanel analytics={analytics} className="border-t-0 pt-0" />
        </Band>
      </div>
    </div>
  );
}

function Band({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="grid gap-y-6 border-t border-slate-200 py-12 dark:border-slate-800 sm:py-16 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-12">
      <h2 className="self-start break-keep text-[15px] font-semibold text-slate-900 dark:text-slate-100 lg:sticky lg:top-24">
        {label}
      </h2>
      <div aria-hidden {...inert(true)} className="w-full max-w-[42rem] select-none">
        {children}
      </div>
    </section>
  );
}
