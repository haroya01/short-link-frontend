"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseGalleryConfig } from "@/lib/block-config-parsers";
import { useAutoSlide } from "@/lib/use-auto-slide";
import type { ThemeColors } from "../_lib/theme";
import { PhotoLightbox } from "./PhotoLightbox";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Inline 1:1 carousel + tap-to-open shared {@link PhotoLightbox}. The inline view always shows
 * each photo at its natural aspect (object-contain) with a blurred copy of the same image as a
 * letterbox backdrop (Instagram / iOS Photos pattern) — visitors see the whole photo without
 * cropping, and the empty padding takes the photo's own color so it never looks like a hole.
 * The lightbox is the "show me bigger" escape hatch.
 *
 * <p>Page-dots and ← → buttons (desktop only) drive horizontal navigation. Touch users rely on
 * native CSS scroll-snap which gives the same physical-feeling swipe.
 */
export function GalleryEntryCard({ content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.gallery");
  const config = useMemo(() => parseGalleryConfig(content), [content]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setActiveIdx(Math.max(0, Math.min(config.images.length - 1, idx)));
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [config.images.length]);

  const scrollToIdx = useCallback((idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  }, []);

  // Auto-advance 5 s — feels like a slow Instagram story. Pauses while the lightbox is open (the
  // visitor's clearly engaging with one specific image), while the tab is backgrounded (handled
  // inside the hook via visibilityState), and on hover / touch (handlers below).
  const { pause: pauseAutoplay, resume: resumeAutoplay } = useAutoSlide({
    intervalMs: 5000,
    enabled: config.images.length > 1 && lightboxIdx === null,
    onTick: () => scrollToIdx((activeIdx + 1) % config.images.length),
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
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
                {config.images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToIdx(idx);
                    }}
                    aria-label={t("goTo", { idx: idx + 1 })}
                    className={
                      "h-1.5 rounded-full transition-all duration-200 " +
                      (idx === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/40")
                    }
                  />
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

