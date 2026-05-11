"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ThemeColors } from "../_lib/theme";
import { PhotoLightbox } from "./PhotoLightbox";

/**
 * Single-image block on the public profile. Tapping the inline preview opens the same
 * {@link PhotoLightbox} the gallery uses — frosted backdrop, scale-in image, ESC + tap-backdrop
 * close. Hosts add an IMAGE block as a hero photo / banner-style content and visitors expect
 * to be able to tap it to see it bigger (vs. the previous "open in new tab" behavior, which
 * stranded them on the raw S3 URL).
 */
export function ImageEntryCard({
  url,
  colors,
  fadeStyle,
}: {
  url: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
}) {
  const t = useTranslations("publicProfile.gallery");
  const [open, setOpen] = useState(false);

  return (
    <>
      <li className="profile-fade" style={fadeStyle}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openImage", { idx: 1 })}
          className={`block w-full cursor-zoom-in overflow-hidden rounded-xl border bg-slate-100 ${colors.card} ${colors.cardBorder}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" loading="lazy" className="block w-full" />
        </button>
      </li>
      {open && (
        <PhotoLightbox
          images={[url]}
          initialIdx={0}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
