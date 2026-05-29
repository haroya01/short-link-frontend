"use client";

import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoplayPlugin from "embla-carousel-autoplay";
import { useTranslations } from "next-intl";
import type { PublicProfile } from "@/types";
import { Link } from "@/i18n/navigation";
import { SHOWCASE_PROFILES } from "@/lib/landing-showcase-fixtures";
import { EntryList } from "@/app/[locale]/u/[username]/_components/entry-list";
import { ProfileHeader } from "@/app/[locale]/u/[username]/_components/profile-header";
import { THEME_TABLE } from "@/app/[locale]/u/[username]/_lib/theme";
import { cn } from "@/lib/utils";

/**
 * Landing-page profile showcase. Renders the real {@link ProfileHeader} + {@link EntryList}
 * inside an iPhone 14 Pro frame (devices.css). The inner content tree exactly mirrors the
 * public {@code /u/[username]/page.tsx} layout — same banner aspect ratio, same mask-image
 * fade, same {@code -mt-12} container overlap — so what visitors see in the showcase is what
 * they'd see if they viewed the real profile page on their phone.
 *
 * Carousel is Embla — touch-swipe on mobile, drag on desktop, autoplay that pauses on hover so
 * users can read a card without it sliding past.
 */
const DEVICE_MAX_SCALE = 0.8;
const DEVICE_NATIVE_W = 428;
const DEVICE_NATIVE_H = 868;

/**
 * Fit the (fixed-size) device into the viewport with side margin so the centered slide is never
 * clipped on small screens. SSR starts at the desktop scale and corrects on mount.
 */
function useDeviceScale() {
  const [scale, setScale] = useState(DEVICE_MAX_SCALE);
  useEffect(() => {
    const compute = () => {
      const fit = (window.innerWidth - 40) / DEVICE_NATIVE_W;
      setScale(Math.max(0.5, Math.min(DEVICE_MAX_SCALE, fit)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return scale;
}

export function ProfileShowcase() {
  const t = useTranslations("showcase");
  const scale = useDeviceScale();
  const autoplayRef = useRef(
    AutoplayPlugin({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: false, align: "center", containScroll: false },
    [autoplayRef.current],
  );

  return (
    <div className="relative">
      {/* Edge fades for the peeking neighbour slides — desktop only. On mobile the centred phone
          nearly fills the width, so a fade here would clip its right edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-24 bg-gradient-to-r from-white to-transparent sm:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-24 bg-gradient-to-l from-white to-transparent sm:block"
      />

      {/* Embla's loop mode wraps slides by cloning them outside the original flex track —
          `gap` on the parent flexbox doesn't apply to the inter-slide spacing around the loop
          seam, so the last → first transition reads as "two slides glued together". Per-slide
          `mr-6` works because the margin is on the slide itself; the clone carries it too, and
          loop wrap stays evenly spaced. The last `mr-6` is harmless visual padding that embla
          accounts for via `containScroll: false`. */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex py-2">
          {SHOWCASE_PROFILES.map((profile) => (
            <ShowcaseCard
              key={profile.username}
              profile={profile}
              demoCta={t("demoCta")}
              scale={scale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({
  profile,
  demoCta,
  scale,
}: {
  profile: PublicProfile;
  demoCta: string;
  scale: number;
}) {
  const colors = THEME_TABLE[profile.theme ?? "default"];
  return (
    <div
      className="group relative mr-6 block shrink-0 cursor-pointer transition-transform hover:-translate-y-1"
      // Promote each slide to its own compositor layer + clip paint to the slide's box.
      // Without this, embla's translateX on the parent flex track forces every slide's
      // ContactCardEntry `filter:` and per-card `backdrop-blur` to repaint as the track
      // moves — with 9 slides (× embla loop clones) that compounds into the jank the user
      // sees. `contain: layout paint` says "nothing inside this slide affects layout/paint
      // outside it", which lets the browser keep the offscreen slides as cached layers and
      // composite them cheaply during the swipe.
      style={{ contain: "layout paint", transform: "translateZ(0)" }}
    >
      <Link
        href={`/showcase/${profile.username}`}
        className="focus-ring absolute inset-0 z-10 rounded-[2rem]"
        aria-label={`@${profile.username} — ${demoCta}`}
      >
        <span className="sr-only">{demoCta}</span>
      </Link>
      <div
        style={{
          width: DEVICE_NATIVE_W * scale,
          height: DEVICE_NATIVE_H * scale,
        }}
      >
        <div
          className="device device-iphone-14-pro"
          // transform-origin MUST be inline: the `origin-top-left` utility loses the cascade to
          // devices.css's `.device` rule (equal specificity, loaded later) which forces a
          // centered origin. With a centered origin scale() shrinks around the native 428px
          // centre, so the device overflows this wrapper box — sized for top-left scaling — by
          // (428-scaledW)/2 on each side, clipping the phone's right edge off-screen on mobile.
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="device-frame">
            <div
              className={cn(
                "device-screen pointer-events-none overflow-y-auto",
                colors.page,
              )}
              style={
                // Inline backgroundColor beats devices.css's `.device .device-screen {
                // background: #000 }` (0,2,0). Without it light/mono themes showed black —
                // the page-color utility (0,1,0) wasn't specific enough to overturn the
                // default. Gradient themes leave pageBgHex undefined so their bg utility
                // (which paints a gradient, not a single color) keeps working unchanged.
                colors.pageBgHex
                  ? { backgroundColor: colors.pageBgHex }
                  : undefined
              }
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
    </div>
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
