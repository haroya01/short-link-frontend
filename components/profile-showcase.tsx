"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicProfile } from "@/types";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { EntryList } from "@/app/[locale]/u/[username]/_components/EntryList";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/ProfileHeader";
import { cn } from "@/lib/utils";

/**
 * Landing-page profile showcase. Renders the real {@link ProfileHeader} + {@link EntryList}
 * components used on /u/&lt;handle&gt; inside an iPhone-shaped frame, scaled down to fit. Same
 * code that powers actual user profiles — what visitors see in the showcase is exactly what
 * they'll build after signing up.
 *
 * Marquee scrolls left continuously; pauses on hover/touch. Each card is a link to /demo so a
 * click hands off to an interactive profile rather than a static dead-end.
 */
const ROW_DURATION_SECONDS = 90;

// iPhone 16 / 16 Pro physical screen is 19.5:9 (1179×2556 / 1320×2868). Express as 9:19.5
// portrait so Tailwind aspect-[9/19.5] holds the right rectangle at any width.
const PHONE_WIDTH_PX = 240;
// Native profile-page content is rendered at the real container width (matches `max-w-md` =
// 28rem = 448px) and scaled down. The scale factor times native width = phone width.
const NATIVE_CONTENT_WIDTH_PX = 448;
const CONTENT_SCALE = PHONE_WIDTH_PX / NATIVE_CONTENT_WIDTH_PX;

export function ProfileShowcase() {
  const t = useTranslations("showcase");
  const tiles = [...SHOWCASE_PROFILES, ...SHOWCASE_PROFILES];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24"
      />

      <div
        className={cn(
          "showcase-marquee flex w-max gap-5 py-2 transition-opacity duration-700",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{ animationDuration: `${ROW_DURATION_SECONDS}s` }}
      >
        {tiles.map((profile, i) => (
          <ShowcaseCard
            key={`${profile.username}-${i}`}
            profile={profile}
            demoCta={t("demoCta")}
          />
        ))}
      </div>

      <style jsx>{`
        .showcase-marquee {
          animation-name: showcase-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .showcase-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes showcase-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-marquee {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function ShowcaseCard({ profile, demoCta }: { profile: PublicProfile; demoCta: string }) {
  const colors = THEME_TABLE[profile.theme ?? "default"];
  // Phone inner aspect: 9 / 19.5 → height = width * 19.5 / 9
  const phoneInnerHeight = (PHONE_WIDTH_PX * 19.5) / 9;
  return (
    <Link
      href="/demo"
      className="group relative shrink-0 transition-transform hover:-translate-y-1"
      aria-label={`@${profile.username} — ${demoCta}`}
    >
      {/* Outer bezel — thick black phone body */}
      <div className="rounded-[40px] bg-slate-900 p-2 shadow-xl shadow-slate-900/15 group-hover:shadow-2xl group-hover:shadow-slate-900/25">
        {/* Inner screen — actual profile content scaled into iPhone proportions. The frame is
            sized in raw pixels so the scale math stays exact regardless of viewport zoom. */}
        <div
          className={cn("relative overflow-hidden rounded-[32px]", colors.page)}
          style={{ width: `${PHONE_WIDTH_PX}px`, height: `${phoneInnerHeight}px` }}
        >
          {/* Dynamic island / notch suggestion */}
          <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />

          {/* Top status-bar safe area */}
          <div className="h-7 w-full" />

          {/* Scaled real-profile content */}
          <div
            className="pointer-events-none origin-top-left"
            style={{
              width: `${NATIVE_CONTENT_WIDTH_PX}px`,
              transform: `scale(${CONTENT_SCALE})`,
            }}
          >
            <div className="px-4 pb-6">
              {profile.bannerUrl && (
                <div className="-mx-4 mb-2 aspect-[3/1] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.bannerUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
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
                emptyLabel=""
              />
            </div>
          </div>

          {/* Bottom fade — smooths the cut-off when entries spill past the screen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent"
            style={{
              backgroundImage:
                "linear-gradient(to top, var(--phone-fade-bg, white) 30%, transparent 100%)",
            }}
          />
        </div>
      </div>
    </Link>
  );
}
