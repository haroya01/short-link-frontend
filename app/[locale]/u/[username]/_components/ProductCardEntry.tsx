"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowRight } from "lucide-react";
import type { ProductCardConfig } from "@/types";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  content: string;
  /**
   * Theme colors accepted for parity; the carousel cards use a fixed white modern surface to
   * stay readable across all themes and feel like discrete "product cards" rather than
   * blending into the page background. Title text + dots respect the theme.
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
 */
export function ProductCardEntry({ content, colors, fadeStyle }: Props) {
  const config = useMemo(() => parseConfig(content), [content]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLLIElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [entered, setEntered] = useState(false);

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

  // Track which card is currently snapped to center. rAF throttle keeps the scroll listener cheap
  // on long swipes; comparing rect centers handles non-uniform card widths (e.g. last card on
  // narrow screens snapping to start instead of center).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const containerRect = el.getBoundingClientRect();
      const containerMid = containerRect.left + containerRect.width / 2;
      const children = Array.from(el.querySelectorAll<HTMLElement>("[data-card]"));
      let best = 0;
      let bestDist = Infinity;
      children.forEach((child, idx) => {
        const r = child.getBoundingClientRect();
        const mid = r.left + r.width / 2;
        const d = Math.abs(mid - containerMid);
        if (d < bestDist) {
          bestDist = d;
          best = idx;
        }
      });
      setActiveIdx(best);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [config.items.length]);

  const scrollToIdx = useCallback((idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.querySelectorAll<HTMLElement>("[data-card]")[idx];
    if (!child) return;
    const left = child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
    el.scrollTo({ left, behavior: "smooth" });
  }, []);

  if (config.items.length === 0) return null;

  return (
    <li ref={wrapperRef} className="profile-fade" style={fadeStyle}>
      {config.title && (
        <p className={`mb-2 px-1 text-[13px] font-semibold ${colors.primary}`}>{config.title}</p>
      )}
      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {config.items.map((item, idx) => {
          const isActive = idx === activeIdx;
          const baseStyle: CSSProperties = {
            // Stagger entrance: each card delayed by 80ms, only kicks in once `entered` is true.
            transitionDelay: entered ? `${idx * 80}ms` : "0ms",
            transform: entered
              ? isActive
                ? "translateY(0) scale(1)"
                : "translateY(0) scale(0.94)"
              : "translateY(20px) scale(0.92)",
            opacity: entered ? (isActive ? 1 : 0.7) : 0,
          };
          return (
            <article
              key={idx}
              data-card
              style={baseStyle}
              className={
                "shrink-0 snap-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] " +
                (isActive ? "shadow-xl shadow-slate-300/50" : "shadow-md shadow-slate-200/40") +
                " w-[78%] max-w-[300px] sm:w-[260px]"
              }
            >
              {item.image && (
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="space-y-1.5 px-4 pb-3 pt-3">
                <p className="text-[15px] font-semibold leading-tight text-slate-900">
                  {item.name}
                </p>
                {item.price && (
                  <p className="text-sm font-medium text-accent-700">{item.price}</p>
                )}
                {item.description && (
                  <p className="line-clamp-2 text-[12px] leading-snug text-slate-500">
                    {item.description}
                  </p>
                )}
              </div>
              {item.ctaUrl && (
                <a
                  href={item.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                      try {
                        navigator.vibrate(10);
                      } catch {
                        /* ignore */
                      }
                    }
                  }}
                  className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-900 transition active:scale-[0.97] hover:bg-slate-50"
                >
                  <span>{item.ctaLabel || "자세히"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              )}
            </article>
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

function parseConfig(raw: string): ProductCardConfig {
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items)
      ? parsed.items
          .filter((v: unknown): v is Record<string, unknown> => !!v && typeof v === "object")
          .map((v: Record<string, unknown>) => ({
            name: typeof v.name === "string" ? v.name : "",
            image: typeof v.image === "string" ? v.image : null,
            price: typeof v.price === "string" ? v.price : null,
            description: typeof v.description === "string" ? v.description : null,
            ctaLabel: typeof v.ctaLabel === "string" ? v.ctaLabel : null,
            ctaUrl: typeof v.ctaUrl === "string" ? v.ctaUrl : null,
          }))
          .filter((it: { name: string }) => it.name.length > 0)
      : [];
    return {
      title: typeof parsed?.title === "string" ? parsed.title : null,
      items,
    };
  } catch {
    return { title: null, items: [] };
  }
}
