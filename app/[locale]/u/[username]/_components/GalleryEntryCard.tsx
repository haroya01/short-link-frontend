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
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryConfig } from "@/types";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Two-tier gallery: a scannable 1:1 cropped carousel inline + a full-screen lightbox on tap that
 * shows each photo at its natural aspect (object-contain). The crop on the inline view keeps the
 * profile feed visually consistent — every gallery card is the same height regardless of which
 * mix of portrait/landscape photos the host uploaded — while the lightbox is the visitor's
 * escape hatch for "show me the actual photo".
 *
 * <p>Inline scroller uses CSS scroll-snap (pure-CSS swipe). We additionally track which slide is
 * currently visible to drive the page-dot indicator + sync the lightbox open-at-index. On
 * desktop, we render ← → buttons since trackpad scroll into a snap container can feel sluggish.
 *
 * <p>Lightbox locks body scroll on open, listens for Escape + arrow keys, and reuses the same
 * scroll-snap pattern internally so swipe between photos feels identical to the inline view.
 */
export function GalleryEntryCard({ content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.gallery");
  const config = useMemo(() => parseConfig(content), [content]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Track which slide is centered as the visitor scrolls — drives page dots + lightbox open-at.
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

  if (config.images.length === 0) return null;

  const multi = config.images.length > 1;

  return (
    <>
      <li className="profile-fade" style={fadeStyle}>
        <div
          className={`relative overflow-hidden rounded-xl border ${colors.card} ${colors.cardBorder}`}
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
                className="relative aspect-square w-full shrink-0 snap-start bg-slate-100"
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
              {/* Desktop ← → buttons — overlaid on the carousel, hidden on touch devices. */}
              <button
                type="button"
                onClick={() => scrollToIdx(Math.max(0, activeIdx - 1))}
                disabled={activeIdx === 0}
                aria-label={t("previous")}
                className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-0 md:grid"
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
                className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-0 md:grid"
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
        <GalleryLightbox
          images={config.images}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          t={t}
        />
      )}
    </>
  );
}

type LightboxProps = {
  images: string[];
  initialIdx: number;
  onClose: () => void;
  t: ReturnType<typeof useTranslations<"publicProfile.gallery">>;
};

/**
 * Full-screen image viewer. Black backdrop, photos at natural aspect (object-contain), horizontal
 * snap scroll for swipe between, ESC + arrow keys + tap-backdrop to close. We lock body scroll
 * while open so the page underneath doesn't shift, and restore the previous overflow on close
 * (so we don't trample another component's lock).
 */
function GalleryLightbox({ images, initialIdx, onClose, t }: LightboxProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [currentIdx, setCurrentIdx] = useState(initialIdx);

  // Jump to the tapped slide on mount (instant, no scroll-smooth so it doesn't animate from idx 0).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[initialIdx] as HTMLElement | undefined;
    if (child) el.scrollLeft = child.offsetLeft;
  }, [initialIdx]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setCurrentIdx(Math.max(0, Math.min(images.length - 1, idx)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [images.length]);

  const nav = useCallback(
    (dir: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = Math.max(0, Math.min(images.length - 1, currentIdx + dir));
      const child = el.children[next] as HTMLElement | undefined;
      if (child) el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    },
    [currentIdx, images.length],
  );

  // ESC / arrow keys + body-scroll lock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "ArrowRight") nav(1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, nav]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <span className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {currentIdx + 1} / {images.length}
        </span>
      )}

      <div
        ref={scrollerRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, idx) => (
          <div
            key={idx}
            className="grid h-full w-full shrink-0 snap-start place-items-center p-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nav(-1);
            }}
            disabled={currentIdx === 0}
            aria-label={t("previous")}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-30 md:grid"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nav(1);
            }}
            disabled={currentIdx === images.length - 1}
            aria-label={t("next")}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-30 md:grid"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

function parseConfig(raw: string): GalleryConfig {
  try {
    const parsed = JSON.parse(raw);
    const images = Array.isArray(parsed?.images)
      ? parsed.images.filter(
          (v: unknown): v is string => typeof v === "string" && v.length > 0,
        )
      : [];
    return { images };
  } catch {
    return { images: [] };
  }
}
