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
 * inside an iPhone 14 Pro frame (devices.css). The inner content tree exactly mirrors the
 * public {@code /u/[username]/page.tsx} layout — same banner aspect ratio, same mask-image
 * fade, same {@code -mt-12} container overlap — so what visitors see in the showcase is what
 * they'd see if they viewed the real profile page on their phone.
 *
 * The device itself is CSS-scaled to fit multiple phones in the carousel, but the inner
 * content is rendered at iPhone-viewport size (390px, devices.css's screen width) without
 * extra scaling — that's the same width a real iPhone 14 Pro browser renders at.
 */
const ROW_DURATION_SECONDS = 90;
const DEVICE_SCALE = 0.65;
const DEVICE_NATIVE_W = 428;
const DEVICE_NATIVE_H = 868;

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
      {/* Wrapper takes the post-scale layout size so flex parent allocates the right slot.
          devices.css uses CSS transform which doesn't affect layout, so without this the
          carousel would lay phones out at their unscaled 428×868 footprint. */}
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
            <div className={cn("device-screen pointer-events-none overflow-y-auto", colors.page)}>
              {/* This subtree is byte-for-byte identical to /u/[username]/page.tsx's body
                  (banner-then-container-with-overlap), so the showcase displays exactly what
                  the visitor would see if they navigated to the real profile on a phone. */}
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

/**
 * Mirror of the body markup in {@code app/[locale]/u/[username]/page.tsx}. Kept in sync by
 * hand — when the real page's banner/overlap structure changes, update both. The duplication
 * is intentional: importing the page component would pull in server-only metadata helpers
 * and the share-fab interactivity that doesn't belong inside the marquee preview.
 */
function ProfilePreviewBody({
  profile,
  colors,
}: {
  profile: PublicProfile;
  colors: (typeof THEME_TABLE)[keyof typeof THEME_TABLE];
}) {
  return (
    <div className="min-h-full">
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
