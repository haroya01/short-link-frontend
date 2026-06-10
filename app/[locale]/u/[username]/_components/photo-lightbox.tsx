"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Props = {
  images: string[];
  initialIdx: number;
  onClose: () => void;
};

/**
 * Full-screen photo viewer used by both the GALLERY block (multi) and the IMAGE block (single).
 * Mounted via {@link createPortal} into {@code document.body} so it escapes ancestor stacking
 * contexts — any parent with {@code transform}, {@code filter}, {@code backdrop-filter},
 * {@code will-change}, {@code perspective}, or {@code contain} would otherwise re-parent our
 * fixed-positioned overlay, clipping the backdrop blur at the section boundary. The portal
 * sidesteps the whole class of "the top is cut off" rendering bugs.
 *
 * <p>Frosted backdrop (translucent + heavy blur + saturation pop) over body-scroll-lock keeps
 * the visitor visually anchored to the profile beneath. The photo enters with a 320ms cubic-bezier
 * scale + translate-up. Swipe between (horizontal scroll-snap), ESC / arrow keys, backdrop tap,
 * and explicit close button all dismiss.
 */
export function PhotoLightbox({ images, initialIdx, onClose }: Props) {
  const t = useTranslations("publicProfile.gallery");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  // First mount renders hidden, then flips to "entered" after the first paint so CSS transitions
  // (backdrop fade + image scale) actually run. requestAnimationFrame is the canonical way to
  // wait one paint without a flickery setTimeout(0).
  const [entered, setEntered] = useState(false);
  // The portal target — only resolvable on the client, so we render null on SSR.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Jump to the tapped slide on mount (instant, no scroll-smooth so it doesn't animate from idx 0).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[initialIdx] as HTMLElement | undefined;
    if (child) el.scrollLeft = child.offsetLeft;
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [initialIdx, portalTarget]);

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
  }, [images.length, portalTarget]);

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

  // Keyboard containment — without the trap, Tab walks into the blurred profile behind the
  // overlay even though we declare aria-modal. Escape lives in the trap; arrows stay here.
  useFocusTrap(dialogRef, { active: true, onEscape: onClose });

  // Arrow keys + body-scroll lock (restored on unmount, so we don't trample another
  // component's lock).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") nav(-1);
      else if (e.key === "ArrowRight") nav(1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [nav]);

  if (!portalTarget) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className={
        "fixed inset-0 z-[100] bg-black/55 backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-200 " +
        (entered ? "opacity-100" : "opacity-0")
      }
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("viewer")}
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
            className="grid h-full w-full shrink-0 snap-start place-items-center px-6 py-16 sm:px-12 sm:py-20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              onClick={(e) => e.stopPropagation()}
              style={{
                transition:
                  "transform 320ms var(--ease), opacity 220ms ease-out",
                transform: entered
                  ? "translateY(0) scale(1)"
                  : "translateY(12px) scale(0.94)",
                opacity: entered ? 1 : 0,
              }}
              className="max-h-[78vh] max-w-[88vw] rounded-xl object-contain shadow-2xl shadow-black/40 ring-1 ring-white/10 sm:max-h-[80vh] sm:max-w-[78vw]"
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
    </div>,
    portalTarget,
  );
}
