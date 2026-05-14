"use client";

import { useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoplayPlugin from "embla-carousel-autoplay";
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
 * inside an iPhone 14 Pro frame (devices.css). The inner content tree exactly mirrors the
 * public {@code /u/[username]/page.tsx} layout — same banner aspect ratio, same mask-image
 * fade, same {@code -mt-12} container overlap — so what visitors see in the showcase is what
 * they'd see if they viewed the real profile page on their phone.
 *
 * Carousel uses Embla — touch-swipe on mobile, drag on desktop, with autoplay that pauses on
 * user interaction. Previous CSS marquee couldn't intercept touch since it ran on transform
 * keyframes; switching to Embla means the carousel feels like a native phone gallery while
 * still progressing on its own.
 */
const DEVICE_SCALE = 0.8;
const DEVICE_NATIVE_W = 428;
const DEVICE_NATIVE_H = 868;

export function ProfileShowcase() {
  const t = useTranslations("showcase");
  const autoplayRef = useRef(
    AutoplayPlugin({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: false, align: "center", containScroll: false },
    [autoplayRef.current],
  );

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-24"
      />

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6 py-2">
          {SHOWCASE_PROFILES.map((profile) => (
            <ShowcaseCard key={profile.username} profile={profile} demoCta={t("demoCta")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ profile, demoCta }: { profile: PublicProfile; demoCta: string }) {
  const colors = THEME_TABLE[profile.theme ?? "default"];
  return (
    <Link
      href={`/showcase/${profile.username}`}
      className="group block shrink-0 transition-transform hover:-translate-y-1"
      aria-label={`@${profile.username} — ${demoCta}`}
    >
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
                "device-screen pointer-events-none overflow-y-auto",
                colors.page,
              )}
              // Foil shimmer relies on pointer-move to animate the shine. Inside the carousel
              // the screen is pointer-events:none (taps go to the wrapper Link), so the foil
              // would otherwise sit flat at its dim default. Raising --card-opacity makes the
              // static shine layers visible without interaction — same shader, just baseline
              // brightness lifted so the carousel previews look like the real card on tilt.
              style={{ ["--card-opacity" as string]: "0.95" }}
            >
              <ProfilePreviewBody profile={profile} colors={colors} />
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

function ProfilePreviewBody({
  profile,
  colors,
}: {
  profile: PublicProfile;
  colors: (typeof THEME_TABLE)[keyof typeof THEME_TABLE];
}) {
  return (
    <div className="min-h-full">
      <div aria-hidden className="h-12 w-full" />

      {profile.bannerUrl && (
        <div
          className="aspect-[3/1] w-full overflow-hidden"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div
        className={cn(
          "mx-auto w-full max-w-md px-4",
          profile.bannerUrl ? "-mt-12 pb-12" : "py-12",
        )}
      >
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
  );
}
