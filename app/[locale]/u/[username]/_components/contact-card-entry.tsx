"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Download, Mail, MapPin, Phone, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ContactCardConfig } from "@/types";
import { parseContactCardConfig } from "@/lib/block-config-parsers";
import { playCardFlipSound } from "@/lib/card-flip-sound";
import { useCardTilt } from "@/hooks/use-card-tilt";
import type { ThemeColors } from "../_lib/theme";
import { getPalette } from "./contact-card-palettes";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Holographic digital business card — pushed toward Pokemon-TCG-foil territory. Five layered
 * tricks that compose into the "this is a physical object" feeling:
 *
 * <ul>
 *   <li><b>3D flip:</b> taps anywhere on the card (except actual interactive controls, which
 *       stopPropagation) rotate it 180° around Y so visitors see a "back" face — a scannable
 *       vCard QR with brand mark + name. The pointer-tilt still works on both faces, so the
 *       back stays alive too.</li>
 *   <li><b>Pointer-tracked tilt + shine:</b> {@code useCardTilt} writes CSS variables for
 *       rotateX/Y and the foil light position; the card tilts with the pointer and the
 *       light catch slides with it.</li>
 *   <li><b>Sharper foil stripe:</b> tight color stops make the diagonal highlight feel like a
 *       real foil light catch. Stripe position scales with pointer at ~1.5× for an exaggerated
 *       parallax.</li>
 *   <li><b>Cross-hatch foil texture:</b> two stacked {@code repeating-linear-gradient}s at ±45°
 *       paint the etched diagonal grid you see on holographic cards in person.</li>
 *   <li><b>Inner bevel ring:</b> a faint inset box-shadow adds card-edge depth.</li>
 * </ul>
 *
 * <p>Front face follows the cross-card "1 primary button" rule: a single full-width vCard save
 * button at the bottom, a small share icon top-right, and {@code tel:} / {@code mailto:} / URL
 * anchors inline with the info rows. Back face is the "scan + save" path for someone who's
 * holding the visitor's phone in front of them.
 */
export function ContactCardEntry({ content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.contactCard");
  const card = useMemo(() => parseContactCardConfig(content), [content]);
  const palette = useMemo(() => getPalette(card.palette), [card.palette]);
  // mono theme is the only one whose primary text is plain {@code text-black} (others use
  // text-slate-900 / text-slate-100). We use this fingerprint to switch the contact card
  // into a flat black-and-white render — no foil shine, no dark substrate — because the
  // page itself is pure white-with-thick-black-border in mono and the dark holographic
  // card looked dropped-in from a different design system.
  const isMono = colors.primary === "text-black";
  const { cardRef, onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } =
    useCardTilt();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  const vcard = useMemo(() => (card.name ? buildVcard(card) : ""), [card]);

  useEffect(() => {
    if (!vcard) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(vcard, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 360,
          color: { dark: "#0f172a", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [vcard]);

  function downloadVcard() {
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(card.name)}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function shareCard() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData: ShareData = { title: card.name, text: shareText(card), url };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user canceled or share failed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable — silent no-op */
    }
  }

  function toggleFlip() {
    setFlipped((v) => !v);
    playCardFlipSound();
  }

  if (!card.name) return null;

  return (
    <li className="profile-fade" style={fadeStyle}>
      {/* Wrapper used to be {@code role="button"} for tap-to-flip, but the card already contains
          real interactive controls (mailto / tel / share / save) — nesting them inside a button
          violates WCAG 4.1.2 (axe: {@code nested-interactive}). Solution: wrapper stays a plain
          {@code <div>} with a click handler so mouse/touch users still get tap-anywhere flip,
          and a visually-hidden focusable button below provides the same flip action for
          keyboard / screen-reader users. */}
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={toggleFlip}
        className="relative cursor-pointer select-none rounded-2xl [perspective:1200px]"
        style={
          {
            "--foil-c1": palette.colors[0],
            "--foil-c2": palette.colors[1],
            "--foil-c3": palette.colors[2],
            "--foil-c4": palette.colors[3],
            "--foil-c5": palette.colors[4],
            "--foil-c6": palette.colors[5],
            "--foil-substrate": palette.substrate,
            "--foil-ambient-1": palette.ambient[0],
            "--foil-ambient-2": palette.ambient[1],
          } as CSSProperties
        }
      >
        {/* Keyboard / screen-reader flip control. Visually hidden by default; reveals itself on
            focus with a visible ring so keyboard navigation isn't a dead end. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFlip();
          }}
          aria-pressed={flipped}
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-30 focus:rounded-md focus:bg-white focus:px-2 focus:py-1 focus:text-xs focus:font-medium focus:text-slate-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent-400"
        >
          {flipped ? t("flipToFront") : t("flipToBack")}
        </button>

        {/* Two wrappers so flip (slow, 600ms) and tilt (fast, 80ms) can have separate transition
            curves. The outer "flip" wrapper handles the 0/180° rotateY for the flip; the inner
            "tilt" wrapper handles the small rotateX/rotateY from pointer + scroll. Splitting
            them is what stops the scroll-driven tilt from lagging the light position (which has
            no transition — radial-gradient updates instantly), which looked "끊긴" / disconnected
            when both rode on the same 600ms transition. */}
        <div
          className="relative [transform-style:preserve-3d]"
          style={{
            transform: `rotateY(${flipped ? 180 : 0}deg)`,
            transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="relative [transform-style:preserve-3d]"
            style={{
              transform:
                "rotateX(var(--rotate-y, 0deg)) rotateY(var(--rotate-x, 0deg))",
              transition: "transform 80ms ease-out",
            }}
          >
            {/* FRONT */}
            <CardFace mono={isMono}>
              {/* Share button — small ghost icon top-right. stopPropagation so tapping it doesn't
                  also flip the card. */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  shareCard();
                }}
                aria-label={t("dockShare")}
                className="focus-ring absolute right-3 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <div className="relative z-10 flex items-start justify-between gap-3 px-6 pt-6">
                <div className="min-w-0 flex-1 pr-8">
                  <p className="text-2xl font-semibold leading-tight tracking-tight">
                    {card.name}
                  </p>
                  {(card.title || card.company) && (
                    <p className="mt-1 text-sm text-slate-300">
                      {[card.title, card.company].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {card.logoUrl && (
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/20 backdrop-blur-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.logoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${card.logoFocalX}% ${card.logoFocalY}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Interactive info rows. stopPropagation on each link so tapping a mailto: /
                  tel: / website link fires the action without flipping the card. */}
              <ul className="relative z-10 mt-4 space-y-2 px-6">
                {card.email && (
                  <Row icon={<Mail className="h-3.5 w-3.5" />}>
                    <a
                      href={`mailto:${card.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="truncate hover:underline"
                    >
                      {card.email}
                    </a>
                  </Row>
                )}
                {card.phone && (
                  <Row icon={<Phone className="h-3.5 w-3.5" />}>
                    <a
                      href={`tel:${card.phone.replace(/\s/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="truncate hover:underline"
                    >
                      {card.phone}
                    </a>
                  </Row>
                )}
                {card.website && (
                  <Row icon={<Globe />}>
                    <a
                      href={card.website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="truncate hover:underline"
                    >
                      {hostWithoutScheme(card.website)}
                    </a>
                  </Row>
                )}
                {card.address && (
                  <Row icon={<MapPin className="h-3.5 w-3.5" />}>
                    <span className="truncate">{card.address}</span>
                  </Row>
                )}
              </ul>

              {/* Single primary action — vCard save. Call/share moved to inline tel: link /
                  corner ghost icon to match the cross-card "1 primary button" rule. Sits
                  immediately below the rows with a small breathing margin; the card itself
                  no longer has a min-height so visually save reads as "the next step after
                  these contact details" rather than a far-away footer. */}
              <div className="relative z-10 mt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadVcard();
                  }}
                  className="focus-ring flex w-full items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white transition hover:bg-white/5 active:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                  <span>{t("dockSave")}</span>
                </button>
              </div>
            </CardFace>

            {/* BACK — scannable vCard QR framed by brand mark (logo or initial) and name.
                Tapping the back face anywhere flips it back to the front (the wrapper's
                onClick handles it). */}
            <CardFace back mono={isMono}>
              <div className="relative z-10 flex h-full flex-col items-center justify-between gap-3 p-5">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {card.logoUrl ? (
                      <div className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-md bg-black/30 p-0.5 ring-1 ring-white/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.logoUrl}
                          alt=""
                          className="h-full w-full rounded object-cover"
                          style={{
                            objectPosition: `${card.logoFocalX}% ${card.logoFocalY}%`,
                          }}
                        />
                      </div>
                    ) : (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/10 text-[10px] font-bold uppercase text-white/90">
                        {card.name.slice(0, 1)}
                      </span>
                    )}
                    <p className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-300">
                      {card.company || t("backTagline")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-slate-400">
                    kurl.me
                  </span>
                </div>

                {qrDataUrl ? (
                  <div className="rounded-2xl bg-white/95 p-3 shadow-2xl shadow-black/50 ring-1 ring-white/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt={t("qrAlt")}
                      className="h-28 w-28 sm:h-32 sm:w-32"
                    />
                  </div>
                ) : (
                  <div className="h-28 w-28 animate-pulse rounded-2xl bg-white/10 sm:h-32 sm:w-32" />
                )}

                <div className="flex w-full flex-col items-center gap-0.5">
                  <p className="max-w-[18ch] text-center text-[14px] font-semibold text-white">
                    {card.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    {t("backScanHint")}
                  </p>
                </div>
              </div>
            </CardFace>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * One face of the flip-card. Stacked layers (back-to-front):
 * 1. Base dark gradient — the substrate.
 * 2. Pointer-tracking radial gradient (color-dodge) — the moving "light catch".
 * 3. Sharp diagonal foil stripe (color-dodge) — the holographic highlight, parallaxes with pointer.
 * 4. Cross-hatch etched grid (overlay) — texture so the foil reads as material, not gradient.
 * 5. Grain noise (overlay) — subpixel jitter so the surface doesn't look perfectly clean.
 * 6. Inner bevel ring (box-shadow inset) — fake card-edge depth.
 * 7. Content layer — text / dock / QR (whatever the caller passes as children).
 */
function CardFace({
  back,
  mono,
  children,
}: {
  back?: boolean;
  /** When true, render flat B&W card matching the mono page theme — no foil layers, no
   *  dark substrate, just white bg + thick black border + dark text. */
  mono?: boolean;
  children: React.ReactNode;
}) {
  if (mono) {
    // Mono variant — completely separate render path. No foil, no shine, no glare, no grain.
    // The dark holographic look is the antithesis of the mono theme aesthetic ("nothing but
    // black on white"), so we skip the entire foil stack and emit a flat card. Children
    // (info rows, save dock, QR) still mount; we adjust their colors via CSS-cascade by
    // setting a {@code .mono-card} class that overrides the text-white descendants the
    // foil-mode children expect.
    return (
      <MonoCardFace back={back}>{children}</MonoCardFace>
    );
  }
  // Original foil card below.
  // Front sits in-flow and defines the rotating wrapper's height. Back is positioned absolutely
  // on top, rotated 180° so its visible side is the "back". Two separate position classes —
  // putting both `relative` and `absolute` on the same node lets the browser pick whichever the
  // generated stylesheet orders last, which was making the back face render in-flow underneath
  // the front (double-stacked card on initial render).
  //
  // Min-height on the front guarantees the back layout has room when a visitor filled in only
  // name + 1–2 fields — the back is `absolute inset-0` so without a floor on the front its
  // content would overflow the rounded clip.
  // Card height tracks the front face's natural content size — no min-height fence. The
  // earlier 260px floor combined with mt-auto on the save dock pushed save to the bottom
  // of the floor, leaving a visible 80px+ gap between the info rows and the save button
  // when fields were sparse (e.g. only name + email). Visitors read that as "save sits
  // disconnected from the contact info" → the "save is up" report. Letting the card
  // collapse to content keeps save tight to the rows, and the back face (absolute inset-0)
  // simply matches whatever the front decides.
  const positionClass = back ? "absolute inset-0" : "relative flex flex-col";
  return (
    <div
      className={
        "contact-card overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-950 text-white shadow-2xl shadow-slate-900/40 " +
        positionClass
      }
      style={{
        // backface-visibility hidden is critical for the flip — without it the visitor sees the
        // back face through the front during the 180° rotation. Tailwind's arbitrary value
        // `[backface-visibility:hidden]` only writes the unprefixed property; iOS Safari (≤ 17)
        // sometimes ignores the unprefixed rule when the element also has `overflow: hidden`
        // (overflow + transform-style:preserve-3d ancestor collapses the 3D context). Setting
        // both via inline style — plus a `translateZ(0)` to force a fresh GPU layer — works
        // around the bug on every device we've tested.
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg) translateZ(0)" : "translateZ(0)",
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, var(--foil-ambient-1, rgba(67, 56, 202, 0.25)) 0%, transparent 50%)," +
          "radial-gradient(120% 80% at 100% 100%, var(--foil-ambient-2, rgba(157, 23, 77, 0.18)) 0%, transparent 55%)," +
          "linear-gradient(135deg, var(--foil-substrate, #0a0e1c) 0%, var(--foil-substrate, #131a30) 60%, var(--foil-substrate, #0a0e1c) 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.45)",
      }}
    >
      {/* SHINE layer 1 — dense repeating rainbow scrolling with pointer/scroll position. Back
          face flips X so the visual direction matches the visitor's pointer side. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(110deg, var(--foil-c1) 0%, var(--foil-c2) 10%, var(--foil-c3) 20%, var(--foil-c4) 30%, var(--foil-c5) 40%, var(--foil-c6) 50%, var(--foil-c1) 60%)",
          backgroundSize: "400% 400%",
          backgroundPosition: back
            ? "calc(100% - var(--background-x, 50%)) var(--background-y, 50%)"
            : "var(--background-x, 50%) var(--background-y, 50%)",
          filter: "brightness(0.85) contrast(2.2) saturate(0.85)",
          mixBlendMode: "color-dodge",
          opacity: "calc(var(--card-opacity, 0.55) * 0.95)",
          transition: "opacity 220ms ease-out",
        }}
      />
      {/* SHINE layer 2 — second rainbow at a different angle (-30°) offset by RAW pointer
          position. Stacking two gradients gives the surface its 3D-ish shimmer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-30deg, var(--foil-c6) 0%, var(--foil-c5) 15%, var(--foil-c4) 30%, var(--foil-c3) 45%, var(--foil-c2) 60%, var(--foil-c1) 75%, var(--foil-c6) 100%)",
          backgroundSize: "400% 400%",
          backgroundPosition: back
            ? "calc(100% - var(--pointer-x, 50%)) var(--pointer-y, 50%)"
            : "var(--pointer-x, 50%) var(--pointer-y, 50%)",
          filter: "brightness(0.85) contrast(1.7) saturate(0.8)",
          mixBlendMode: "color-dodge",
          opacity: "calc(var(--card-opacity, 0.55) * 0.55)",
          transition: "opacity 220ms ease-out",
        }}
      />
      {/* GLARE — radial highlight at pointer position, OVERLAY blend so it brightens the shine
          layers rather than washing them out. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: back
            ? "radial-gradient(farthest-corner circle at calc(100% - var(--pointer-x, 50%)) var(--pointer-y, 50%), hsla(0,0%,100%,0.6) 8%, hsla(0,0%,100%,0.25) 22%, hsla(0,0%,0%,0.4) 90%)"
            : "radial-gradient(farthest-corner circle at var(--pointer-x, 50%) var(--pointer-y, 50%), hsla(0,0%,100%,0.6) 8%, hsla(0,0%,100%,0.25) 22%, hsla(0,0%,0%,0.4) 90%)",
          mixBlendMode: "overlay",
          opacity: "calc(var(--card-opacity, 0.55) * 0.7 + 0.18)",
          transition: "opacity 220ms ease-out",
        }}
      />
      {/* Faint grain — surface doesn't read as glass-clean. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      {children}
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-[13px] text-slate-200/90">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

function Globe() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}


function buildVcard(card: ContactCardConfig): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcard(card.name)}`];
  if (card.company) lines.push(`ORG:${escapeVcard(card.company)}`);
  if (card.title) lines.push(`TITLE:${escapeVcard(card.title)}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${card.email}`);
  if (card.phone) lines.push(`TEL;TYPE=CELL:${card.phone}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${escapeVcard(card.address)};;;`);
  if (card.website) lines.push(`URL:${card.website}`);
  lines.push("END:VCARD");
  return lines.join("\r\n") + "\r\n";
}

function escapeVcard(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1");
}

function shareText(card: ContactCardConfig): string {
  const parts = [card.title, card.company].filter(Boolean);
  return parts.length > 0 ? `${card.name} — ${parts.join(", ")}` : card.name;
}

/**
 * Mono-theme variant of {@link CardFace}. Strips every foil layer (shine 1/2, glare, noise) and
 * the dark substrate; instead renders a flat white card with a thick black border to match the
 * mono page theme's visual language. Children come from the same call sites as the foil mode,
 * which means they were authored assuming dark substrate (text-white, text-slate-300, etc.).
 * The {@code .mono-card} class below uses descendant selectors in {@code globals.css} to flip
 * those near-white text colors to readable dark variants without forking the children's JSX.
 */
function MonoCardFace({ back, children }: { back?: boolean; children: React.ReactNode }) {
  const positionClass = back ? "absolute inset-0" : "relative flex flex-col";
  return (
    <div
      className={`mono-card overflow-hidden rounded-2xl border-2 border-black bg-white text-black ${positionClass}`}
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg) translateZ(0)" : "translateZ(0)",
        boxShadow: "3px 3px 0 0 #000",
      }}
    >
      {children}
    </div>
  );
}

function slug(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 40) || "contact"
  );
}

function hostWithoutScheme(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
