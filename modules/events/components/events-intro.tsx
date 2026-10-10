"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SignInLink } from "@/components/auth/sign-in-link";
import { PromoActions, PromoExample, PromoHero, PromoLines, PromoSection } from "@/components/landing/promo";
import type { EventAnalytics } from "@/modules/events/api/events";
import { AnalyticsPanel } from "./analytics-panel";
import { EventHead, type EventHeadData } from "./event-head";

const DAY_MS = 86_400_000;

/** A week and a bit after the build, 7pm in Seoul — the example never shows a date already past. */
function exampleStart(): Date {
  const built = Date.parse(`${process.env.NEXT_PUBLIC_BUILD_DATE ?? ""}T10:00:00Z`);
  return new Date((Number.isNaN(built) ? Date.UTC(2026, 8, 28, 10) : built) + 9 * DAY_MS);
}

export function EventsIntro() {
  const t = useTranslations("events.intro");
  const tDemo = useTranslations("events.intro.demo");

  const event = useMemo<EventHeadData>(() => {
    const start = exampleStart();
    return {
      coverImageUrl: null,
      title: tDemo("eventTitle"),
      organizerName: tDemo("hostName"),
      organizerAvatarUrl: null,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 2 * 3_600_000).toISOString(),
      timezone: "Asia/Seoul",
      locationText: tDemo("eventPlace"),
      locationUrl: null,
      onlineUrl: null,
      attending: 7,
      capacity: 20,
      spotsLeft: 13,
    };
  }, [tDemo]);

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
      <PromoHero
        title={t("title")}
        lead={t("subtitle")}
        action={
          <SignInLink reason="events" next="/events" className={buttonVariants({ variant: "accent", size: "xl" })}>
            {t("ctaLogin")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </SignInLink>
        }
        hint={t("ctaHint")}
      />

      <PromoSection title={t("example.title")} desc={t("example.desc")}>
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t("example.guest")}</h3>
            <PromoExample className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <EventHead event={event} heading="h3" />
            </PromoExample>
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{t("example.host")}</h3>
            <PromoExample className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
              <AnalyticsPanel analytics={analytics} className="border-t-0 pt-0" />
            </PromoExample>
          </div>
        </div>

        <PromoLines
          items={(["step1", "step2", "step3"] as const).map((step) => ({
            title: t(`${step}.title`),
            body: t(`${step}.body`),
          }))}
        />

        <PromoActions>
          <SignInLink reason="events" next="/events" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {t("ctaLogin")}
          </SignInLink>
        </PromoActions>
      </PromoSection>
    </div>
  );
}
