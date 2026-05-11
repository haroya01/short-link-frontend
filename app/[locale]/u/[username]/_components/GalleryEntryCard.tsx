"use client";

import type { CSSProperties } from "react";
import type { GalleryConfig } from "@/types";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Horizontal scroll-snap carousel — each image takes up the visible card width and the user swipes
 * (mobile) or scrolls (trackpad) through them. snap-mandatory means partial cards never "park"
 * between snaps. Aspect ratio is fixed so the surrounding layout doesn't jump while images load.
 * Pure CSS, no JS — keeps the public profile light.
 */
export function GalleryEntryCard({ content, colors, fadeStyle }: Props) {
  const config = parseConfig(content);
  if (config.images.length === 0) return null;

  return (
    <li className="profile-fade" style={fadeStyle}>
      <div
        className={`overflow-hidden rounded-xl border ${colors.card} ${colors.cardBorder}`}
      >
        <div className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
          {config.images.map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-[4/3] w-full shrink-0 snap-start bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        {config.images.length > 1 && (
          <p className={`px-4 py-2 text-center text-[10px] ${colors.muted}`}>
            ← {config.images.length} →
          </p>
        )}
      </div>
    </li>
  );
}

function parseConfig(raw: string): GalleryConfig {
  try {
    const parsed = JSON.parse(raw);
    const images =
      Array.isArray(parsed?.images)
        ? parsed.images.filter((v: unknown): v is string => typeof v === "string" && v.length > 0)
        : [];
    return { images };
  } catch {
    return { images: [] };
  }
}
