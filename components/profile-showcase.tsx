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
 * components used on /u/&lt;handle&gt; inside an iPhone 14 Pro frame (from the open-source
 * {@code devices.css} library). Same code that powers actual user profiles — what visitors see
 * in the showcase is exactly what they'll build after signing up.
 *
 * Marquee scrolls left continuously; pauses on hover/touch. Each card is a link to /demo so a
 * click hands off to an interactive profile rather than a static dead-end.
 */
const ROW_DURATION_SECONDS = 90;

// devices.css iPhone 14 Pro is 428×868 (frame) with a 390×830 screen viewport. We scale the
// whole device down so multiple phones fit in the carousel. Inside the screen, we render the
// native-width (448px) profile content and scale that to match the device's 390px screen.
const DEVICE_SCALE = 0.65;
const DEVICE_NATIVE_W = 428;
const DEVICE_NATIVE_H = 868;
const SCREEN_NATIVE_W = 390;
const CONTENT_NATIVE_W = 448; // matches the public /u/[username] page's max-w-md container
const CONTENT_SCALE = SCREEN_NATIVE_W / CONTENT_NATIVE_W;

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
          "showcase-marquee flex w-max gap-6 py-2 transition-opacity duration-700",
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
  return (
    <Link
      href="/demo"
      className="group block shrink-0 transition-transform hover:-translate-y-1"
      aria-label={`@${profile.username} — ${demoCta}`}
    >
      {/* Outer wrapper takes the device's scaled-down dimensions so the carousel knows the real
          layout size — important because the device itself uses CSS transform which doesn't
          affect layout flow. */}
      <div
        style={{
          width: DEVICE_NATIVE_W * DEVICE_SCALE,
          height: DEVICE_NATIVE_H * DEVICE_SCALE,
        }}
      >
        <div
          className="device device-iphone-14-pro origin-top-left"
          style={{ transform: `scale(${DEVICE_SCALE})` }}
        >
          <div className="device-frame">
            <div
              className={cn(
                "device-screen pointer-events-none overflow-hidden",
                colors.page,
              )}
            >
              {/* Profile rendered at native size, then scaled to the device's screen width */}
              <div
                className="origin-top-left"
                style={{
                  width: `${CONTENT_NATIVE_W}px`,
                  transform: `scale(${CONTENT_SCALE})`,
                }}
              >
                {profile.bannerUrl && (
                  <div className="aspect-[3/1] w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.bannerUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="px-4 pb-6">
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
            </div>
          </div>
          <div className="device-stripe" />
          <div className="device-header" />
          <div className="device-sensors" />
          <div className="device-btns" />
          <div className="device-power" />
        </div>
      </div>
    </Link>
  );
}
