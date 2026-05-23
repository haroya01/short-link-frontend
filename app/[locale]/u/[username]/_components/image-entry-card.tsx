"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ThemeColors } from "../_lib/theme";
import { PhotoLightbox } from "./photo-lightbox";

/**
 * Single-image block on the public profile. Tapping the inline preview opens the same
 * {@link PhotoLightbox} the gallery uses — frosted backdrop, scale-in image, ESC + tap-backdrop
 * close. Hosts add an IMAGE block as a hero photo / banner-style content and visitors expect
 * to be able to tap it to see it bigger (vs. the previous "open in new tab" behavior, which
 * stranded them on the raw S3 URL).
 *
 * <p>Visual treatment: fixed {@code aspect-[4/3]} letterbox matching the Visual-first archetype
 * standard (gallery / product). The image renders {@code object-contain} so portraits, squares,
 * and odd ratios are never cropped; a blurred copy of the same image fills the letterbox bars so
 * the empty padding takes the photo's own color, not a flat gray. This keeps every IMAGE card in
 * the feed at the same height regardless of the visitor's upload — previously the natural-aspect
 * approach let a tall portrait take the full viewport while a landscape took 200 px, breaking the
 * feed's vertical rhythm.
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
          className={`profile-card relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-slate-100 ${colors.card} ${colors.cardBorder}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            loading="lazy"
            className="relative h-full w-full object-contain"
          />
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
