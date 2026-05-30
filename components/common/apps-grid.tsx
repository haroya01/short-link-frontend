"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { blogHref, currentProduct, linksHref, type Product } from "@/lib/host";
import { Mark } from "@/components/common/logo";

/**
 * Cross-product switcher. The header pill shows the *destination* brand (the mark + its wordmark),
 * so a single click warps you to the other product — there's only ever one other surface, so the
 * old grid-icon + popover was a needless second step. Clicking plays the warp overlay, then does
 * the (cross-origin) navigation.
 * Decision: [[decisions/2026-05-29-product-surface-c-lite]]
 */
const PRODUCTS: { key: Product; href: () => string; labelKey: string; hintKey: string }[] = [
  { key: "links", href: () => linksHref("/"), labelKey: "linksLabel", hintKey: "linksHint" },
  { key: "blog", href: () => blogHref("/"), labelKey: "blogLabel", hintKey: "blogHint" },
];

/** Destination wordmark — blog gets the "blog." prefix in a muted tone over the given base color. */
function Wordmark({ product, muted }: { product: Product; muted: string }) {
  if (product === "blog") {
    return (
      <>
        <span className={muted}>blog.</span>kurl
      </>
    );
  }
  return <>kurl</>;
}

type Warp = { href: string; product: Product };

export function AppsGrid() {
  const [warp, setWarp] = useState<Warp | null>(null);
  // Resolved client-side: currentProduct() is host/path based and returns "links" during SSR, so we
  // settle the destination after mount to avoid a hydration mismatch on the blog surface.
  const [dest, setDest] = useState<(typeof PRODUCTS)[number] | null>(null);
  const t = useTranslations("nav.apps");

  useEffect(() => {
    const cur = currentProduct();
    setDest(PRODUCTS.find((p) => p.key !== cur) ?? PRODUCTS[1]);
  }, []);

  // Play the warp overlay, then navigate. New-tab / modified clicks and reduced-motion fall through
  // to the plain anchor (native cross-origin navigation, no overlay).
  const switchTo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!dest) {
      e.preventDefault();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    const href = dest.href();
    setWarp({ href, product: dest.key });
    // Mark draws (~0.4s) → brief hold → green disc blooms (covers ~1.0s) → wordmark. Navigate once
    // the disc has fully covered, so the cross-origin reload never flashes white.
    window.setTimeout(() => {
      window.location.href = href;
    }, 1050);
  };

  return (
    <>
      <a
        href={dest?.href() ?? "#"}
        onClick={switchTo}
        className="group inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-white pl-2.5 pr-2 text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        aria-label={dest ? t(dest.labelKey) : t("trigger")}
        title={dest ? t(dest.hintKey) : undefined}
      >
        <Mark className="h-3 text-accent-600" />
        <span
          className="min-w-[2.5rem] text-[13px] font-bold leading-none tracking-[-0.04em]"
          aria-hidden={!dest}
        >
          {dest ? <Wordmark product={dest.key} muted="text-slate-400" /> : null}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>

      {warp &&
        typeof document !== "undefined" &&
        createPortal(
          // Portal to <body>: a transformed/blurred header ancestor would otherwise be the
          // containing block for `fixed`, clipping the overlay to the header height.
          <div
            className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-white"
            role="status"
            aria-live="polite"
          >
            {/* Brand-green disc that blooms from the mark's center. `rounded-full` + a radius that
                already clears the viewport's far corner keeps it a clean circle the whole way. */}
            <span
              aria-hidden
              className="warp-flood pointer-events-none absolute left-1/2 top-1/2 -ml-[75vmax] -mt-[75vmax] h-[150vmax] w-[150vmax] rounded-full bg-accent-600"
            />
            {/* The mark draws on, line by line, then dissolves into the flood (same green). */}
            <svg
              aria-hidden
              viewBox="0 0 28 18"
              fill="currentColor"
              className="relative col-start-1 row-start-1 h-[78px] w-auto text-accent-600"
            >
              <rect className="warp-stroke warp-stroke-1" x="6" y="1" width="20" height="3.4" rx="1.7" />
              <rect className="warp-stroke warp-stroke-2" x="0" y="7.3" width="28" height="3.4" rx="1.7" />
              <rect className="warp-stroke warp-stroke-3" x="9" y="13.6" width="17" height="3.4" rx="1.7" />
            </svg>
            {/* Destination wordmark, fading in over the flood. */}
            <span className="warp-word relative col-start-1 row-start-1 text-[27px] font-bold tracking-[-0.04em] text-white">
              <Wordmark product={warp.product} muted="text-white/55" />
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
