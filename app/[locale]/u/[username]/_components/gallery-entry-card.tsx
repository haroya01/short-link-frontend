"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseGalleryConfig } from "@/modules/profile/lib/block-config-parsers";
import { useAutoSlide } from "@/hooks/use-auto-slide";
import { useCardCarousel } from "@/hooks/use-card-carousel";
import type { ThemeColors } from "../_lib/theme";
import { PhotoLightbox } from "./photo-lightbox";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Inline 4:3 carousel + tap-to-open shared {@link PhotoLightbox}. The inline view crops each
 * photo to {@code object-cover} at a fixed 4:3 aspect — same fit as ProductCard so the two
 * "horizontal image card" surfaces read with identical density and visual weight, instead of the
 * previous {@code object-contain} + blurred-backdrop letterbox which made portrait shots look
 * tiny and sparse next to landscape ones (사용자 피드백: "어떤 이미지는 중앙에 작게 들어감 /
 * 콘텐츠 밀도가 낮아 보임"). Visitors who want the original framing tap into the lightbox.
 *
 * <p>Page-dots and ← → buttons (desktop only) drive horizontal navigation. Touch users rely on
 * native CSS scroll-snap which gives the same physical-feeling swipe.
 */
export function GalleryEntryCard({ content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.gallery");
  const config = useMemo(() => parseGalleryConfig(content), [content]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const { scrollerRef, activeIdx, scrollToIdx } = useCardCarousel({
    itemCount: config.images.length,
    behavior: "start",
  });

  // Auto-advance 5 s — feels like a slow Instagram story. Pauses while the lightbox is open (the
  // visitor's clearly engaging with one specific image), while the tab is backgrounded (handled
  // inside the hook via visibilityState), and on hover / touch (handlers below).
  const { pause: pauseAutoplay, resume: resumeAutoplay } = useAutoSlide({
    intervalMs: 5000,
    enabled: config.images.length > 1 && lightboxIdx === null,
    onTick: () => scrollToIdx((activeIdx + 1) % config.images.length),
    // Pause the 5 s advance while this card is scrolled out of view (off-screen rAF/re-render waste).
    viewportRef: scrollerRef,
  });

  if (config.images.length === 0) return null;

  const multi = config.images.length > 1;

  return (
    <>
      <li className="profile-fade" style={fadeStyle}>
        <div
          className={`profile-card-static relative overflow-hidden ${colors.card} ${colors.cardBorder}`}
          onMouseEnter={pauseAutoplay}
          onMouseLeave={resumeAutoplay}
          onTouchStart={pauseAutoplay}
          // Keyboard parity with hover: a slide mustn't advance under the user mid-interaction.
          onFocusCapture={pauseAutoplay}
          onBlurCapture={resumeAutoplay}
        >
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {config.images.map((url, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setLightboxIdx(idx)}
                className="relative aspect-[4/3] w-full shrink-0 cursor-zoom-in snap-start overflow-hidden bg-slate-100"
                aria-label={t("openImage", { idx: idx + 1 })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
          {multi && (
            <>
              <button
                type="button"
                onClick={() => scrollToIdx(Math.max(0, activeIdx - 1))}
                disabled={activeIdx === 0}
                aria-label={t("previous")}
                className="focus-ring absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-0 md:grid"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  scrollToIdx(Math.min(config.images.length - 1, activeIdx + 1))
                }
                disabled={activeIdx === config.images.length - 1}
                aria-label={t("next")}
                className="focus-ring absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-0 md:grid"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Each dot is a 24px button (WCAG 2.5.8 minimum) wrapping the 6px visual — the bare
                  6px dots were impossible to hit on touch, and on mobile (arrows are md+) they're
                  the only non-swipe navigation. */}
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-black/40 px-1 backdrop-blur-sm">
                {config.images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToIdx(idx);
                    }}
                    aria-label={t("goTo", { idx: idx + 1 })}
                    aria-current={idx === activeIdx}
                    className="focus-ring grid h-6 w-6 place-items-center rounded-full"
                  >
                    <span
                      aria-hidden
                      className={
                        "h-1.5 rounded-full transition-all duration-200 " +
                        (idx === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/40")
                      }
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </li>

      {lightboxIdx !== null && (
        <PhotoLightbox
          images={config.images}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}

