"use client";

import { useRef } from "react";
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
 * Two pieces of "the carousel doesn't get the real interactive treatment" handled here:
 *
 *  1. Carousel is Embla — touch-swipe on mobile, drag on desktop, autoplay that pauses on
 *     hover so users can read a card without it sliding past.
 *  2. Foil shimmer on {@link ContactCardEntry} normally rides on pointer-move; inside the
 *     marquee the screen is {@code pointer-events:none} so the cards would sit dim and flat.
 *     The {@code showcase-foil-drift} keyframes below animate the four CSS vars the foil
 *     shader reads ({@code --background-x/y}, {@code --pointer-x/y}) so the holographic
 *     pattern keeps moving even with no pointer — the showcase ends up looking as alive as
 *     the real card on a real device tilt.
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

      {/* @property declarations are what make the CSS vars animatable — without them the
          browser treats them as opaque strings and skips interpolation, so the keyframes
          would snap between values instead of drifting. Chrome 85+, Safari 16.4+, FF 128+
          all support this. Older browsers fall back to the static `--card-opacity` bump
          set inline on the screen below, which already shows the foil pattern; just not
          moving. */}
      <style jsx global>{`
        @property --background-x {
          syntax: "<percentage>";
          initial-value: 50%;
          inherits: true;
        }
        @property --background-y {
          syntax: "<percentage>";
          initial-value: 50%;
          inherits: true;
        }
        @property --pointer-x {
          syntax: "<percentage>";
          initial-value: 50%;
          inherits: true;
        }
        @property --pointer-y {
          syntax: "<percentage>";
          initial-value: 50%;
          inherits: true;
        }
        @keyframes showcase-foil-drift {
          0% {
            --background-x: 20%;
            --background-y: 30%;
            --pointer-x: 30%;
            --pointer-y: 70%;
          }
          25% {
            --background-x: 80%;
            --background-y: 30%;
            --pointer-x: 75%;
            --pointer-y: 35%;
          }
          50% {
            --background-x: 75%;
            --background-y: 75%;
            --pointer-x: 70%;
            --pointer-y: 80%;
          }
          75% {
            --background-x: 30%;
            --background-y: 70%;
            --pointer-x: 25%;
            --pointer-y: 55%;
          }
          100% {
            --background-x: 20%;
            --background-y: 30%;
            --pointer-x: 30%;
            --pointer-y: 70%;
          }
        }
        .showcase-shimmer {
          animation: showcase-foil-drift 9s ease-in-out infinite;
        }
        /* Disable shimmer on mobile + reduce-motion. The 9s keyframe animates four custom
           properties through @property interpolation across N concurrent slides — on phones
           that compounds into noticeable jank during embla's loop reset (slide N → slide 1
           transform jump). Desktop GPUs handle it fine, so keep it there. */
        @media (max-width: 768px), (prefers-reduced-motion: reduce) {
          .showcase-shimmer {
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
                "device-screen pointer-events-none overflow-y-auto showcase-shimmer",
                colors.page,
              )}
              // --card-opacity 0.95 lifts the foil layers to near-full brightness so the
              // animated shine drift reads clearly even at the marquee's reduced scale.
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
