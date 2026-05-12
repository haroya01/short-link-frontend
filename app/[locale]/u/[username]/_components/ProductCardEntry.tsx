"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { ProductCardImage } from "@/types";
import { parseProductCardConfig } from "@/lib/block-config-parsers";
import { useAutoSlide } from "@/lib/use-auto-slide";
import { useCardCarousel } from "@/lib/use-card-carousel";
import type { ThemeColors } from "../_lib/theme";
import { CardCtaBar } from "./CardCtaBar";
import { PhotoLightbox } from "./PhotoLightbox";

type Props = {
  content: string;
  /**
   * Theme colors drive the wrapper border + background so the product carousel reads as part of
   * the same surface family as the link / event / email blocks. The snapped (centered) card gets a
   * stronger shadow as visual emphasis — that's the only style deviation from the rest of the
   * feed, and it's intentional: a horizontal scroller without one card popping forward feels
   * inert.
   */
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Horizontal product carousel — the vertical-agnostic "row of selling cards" block. Three motion
 * concerns layered for a premium feel without depending on Framer Motion:
 * <ul>
 *   <li><b>Stagger entrance</b>: cards fade + slide + scale in on first viewport entry,
 *       80ms apart. Driven by IntersectionObserver so feed scrolling triggers animation once
 *       per block.</li>
 *   <li><b>Active emphasis</b>: the centered (snap-aligned) card sits at scale 1 + full opacity
 *       + strong shadow; siblings dim to 0.94 / 0.7. Tracked via a scroll listener (rAF-throttled)
 *       comparing each card's distance to the container center.</li>
 *   <li><b>Page dots</b>: small indicator below shows position. Updated alongside the active
 *       tracking. Tappable for keyboard / desktop users to jump.</li>
 * </ul>
 * Scroll-snap is CSS only — `scroll-snap-type: x mandatory` keeps swipes feeling physical without
 * a JS-driven carousel library.
 *
 * <p>Each item carries up to 5 images. The first acts as the hero (rendered with the user's
 * per-image focal point as {@code object-position} so the chosen part of the image stays in view
 * after {@code object-cover}). When an item has more than one image, a tap-only thumbnail strip
 * below the hero lets the visitor swap which one fills the hero slot — no nested swipe carousel,
 * so finger gestures on the outer carousel stay unambiguous.
 */
export function ProductCardEntry({ content, colors, fadeStyle }: Props) {
  const config = useMemo(() => parseProductCardConfig(content), [content]);
  const wrapperRef = useRef<HTMLLIElement | null>(null);
  const [entered, setEntered] = useState(false);
  // Carousel uses "start" alignment now that each item is a full-width snap page (the old
  // "center" mode with peek was replaced when we standardized card widths — see PR #105).
  const { scrollerRef, activeIdx, scrollToIdx } = useCardCarousel({
    itemCount: config.items.length,
    behavior: "start",
  });

  // Trigger the entrance stagger when the whole block first enters the viewport. We only fire
  // once — once visible, cards stay visible. Disconnects to avoid leaks on profiles with many
  // PRODUCT_CARD blocks (e.g. a restaurant with several menus).
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (typeof IntersectionObserver === "undefined") {
      setEntered(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  if (config.items.length === 0) return null;

  // Single item — render as a regular full-width card matching the other feed entries. No
  // horizontal scroller, no dots, no peek of an adjacent item that doesn't exist. This is
  // the design language: one item should look like a sibling of LinkEntry / EventEntry /
  // PlaceEntry, not a carousel of one.
  const singleItem = config.items.length === 1;

  return (
    <li ref={wrapperRef} className="profile-fade" style={fadeStyle}>
      {config.title && (
        <p className={`mb-2 px-1 text-[13px] font-semibold ${colors.primary}`}>{config.title}</p>
      )}
      <div
        ref={scrollerRef}
        className={
          singleItem
            ? ""
            : "-mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {config.items.map((item, idx) => {
          const isActive = singleItem || idx === activeIdx;
          const baseStyle: CSSProperties = singleItem
            ? {}
            : {
                // Stagger entrance: each card delayed by 80ms, only kicks in once `entered` is true.
                transitionDelay: entered ? `${idx * 80}ms` : "0ms",
                transform: entered
                  ? "translateY(0) scale(1)"
                  : "translateY(12px) scale(0.97)",
                opacity: entered ? 1 : 0,
              };
          // Per-card outer wrapper: in single mode it's a plain block; in carousel mode it's a
          // full-width snap page (one item per visible page — matches the other cards' width
          // exactly, no peek, swipe to the next page like Instagram stories).
          const itemWrapperClass = singleItem
            ? ""
            : "w-full shrink-0 snap-center pr-3 last:pr-0";
          return (
            <div key={idx} data-card style={baseStyle} className={itemWrapperClass}>
              <article
                className={
                  `overflow-hidden rounded-2xl border ${colors.card} ${colors.cardBorder} ` +
                  (isActive
                    ? "shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
                    : "shadow-[0_1px_2px_rgba(15,23,42,0.04)]") +
                  " transition-shadow duration-300"
                }
              >
                <CardImages images={item.images} />
                <div className="space-y-1.5 px-4 pb-3 pt-3">
                  <p className={`text-[15px] font-semibold leading-tight ${colors.primary}`}>
                    {item.name}
                  </p>
                  {item.price && (
                    <p className="text-sm font-medium text-accent-700">{item.price}</p>
                  )}
                  {item.description && (
                    <p className={`line-clamp-2 text-[12px] leading-snug ${colors.muted}`}>
                      {item.description}
                    </p>
                  )}
                </div>
                {item.ctaUrl && (
                  <CardCtaBar
                    href={item.ctaUrl}
                    label={item.ctaLabel || "자세히"}
                    colors={colors}
                    onClick={() => {
                      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                        try {
                          navigator.vibrate(10);
                        } catch {
                          /* ignore */
                        }
                      }
                    }}
                  />
                )}
              </article>
            </div>
          );
        })}
      </div>
      {config.items.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {config.items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToIdx(idx)}
              aria-label={`Go to card ${idx + 1}`}
              className={
                "h-1.5 rounded-full transition-all duration-200 " +
                (idx === activeIdx
                  ? `w-5 ${colors.primary.replace("text-", "bg-")}`
                  : "w-1.5 bg-slate-300")
              }
            />
          ))}
        </div>
      )}
    </li>
  );
}

/**
 * Hero + thumb-strip renderer for a single card's images. The hero slot is the only image actually
 * visible at full size; tapping a thumbnail swaps which entry is featured. We avoid a nested
 * swipe carousel here — the outer card carousel already owns horizontal swipe gestures, so an
 * inner swipe would force the user to fight gesture disambiguation on every drag. Tap-only
 * thumbs sidestep it.
 *
 * <p>Auto-slide cycles the hero every 5 s when more than one image is present. Pauses on hover /
 * touch / lightbox open / tab hidden — same contract as {@link GalleryEntryCard}. Tapping the
 * hero opens the shared {@link PhotoLightbox} for fullscreen zoom + swipe between images.
 */
function CardImages({ images }: { images: ProductCardImage[] }) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const safeIdx = heroIdx < images.length ? heroIdx : images.length - 1;

  const { pause: pauseAutoplay, resume: resumeAutoplay } = useAutoSlide({
    intervalMs: 5000,
    enabled: images.length > 1 && lightboxIdx === null,
    onTick: () => setHeroIdx((i) => (i + 1) % images.length),
  });

  if (images.length === 0) return null;
  const hero = images[safeIdx];

  return (
    <>
      <div onMouseEnter={pauseAutoplay} onMouseLeave={resumeAutoplay} onTouchStart={pauseAutoplay}>
        <button
          type="button"
          onClick={() => setLightboxIdx(safeIdx)}
          aria-label="Open image"
          className="block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-slate-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-opacity duration-500"
            style={{ objectPosition: `${hero.focalX}% ${hero.focalY}%` }}
          />
        </button>
        {images.length > 1 && (
          <div className="flex gap-1 border-t border-slate-100 bg-slate-50/50 px-2 py-1.5">
            {images.map((image, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroIdx(idx)}
                aria-label={`Image ${idx + 1}`}
                className={
                  "h-10 w-12 shrink-0 overflow-hidden rounded border transition " +
                  (idx === safeIdx
                    ? "border-accent-500 ring-1 ring-accent-300"
                    : "border-slate-200 opacity-70 hover:opacity-100")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  style={{ objectPosition: `${image.focalX}% ${image.focalY}%` }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {lightboxIdx !== null && (
        <PhotoLightbox
          images={images.map((i) => i.url)}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </>
  );
}

