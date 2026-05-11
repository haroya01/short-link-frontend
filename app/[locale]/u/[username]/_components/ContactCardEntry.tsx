"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Download, Mail, MapPin, Phone, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import type { ContactCardConfig } from "@/types";
import { playCardFlipSound } from "@/lib/card-flip-sound";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Holographic digital business card — pushed toward Pokemon-TCG-foil territory. Four layered
 * tricks that compose into the "this is a physical object" feeling:
 *
 * <ul>
 *   <li><b>3D flip:</b> taps on the flip button rotate the card 180° around Y so visitors see
 *       a "back" face — a giant scannable vCard QR. The pointer-tilt still works on both faces,
 *       so the back stays alive too.</li>
 *   <li><b>Sharper foil stripe:</b> tight color stops (yellow → purple → cyan, 38%→62%) make the
 *       diagonal highlight feel like a real foil light catch, vs. the softer multi-stop rainbow
 *       it was before. Stripe position scales with pointer at ~1.5× for an exaggerated parallax.</li>
 *   <li><b>Cross-hatch foil texture:</b> two stacked {@code repeating-linear-gradient}s at ±45°
 *       paint the etched diagonal grid you see on holographic cards in person. Overlay
 *       blend-mode + low opacity keeps it as texture, not pattern.</li>
 *   <li><b>Inner bevel ring:</b> {@code box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08)} adds
 *       a faint inner edge highlight — the card looks like it has thickness.</li>
 * </ul>
 *
 * Action dock + QR + vCard download from the previous version are preserved; what changed is
 * the material on the surface and the flip mechanic.
 */
export function ContactCardEntry({ content, colors, fadeStyle }: Props) {
  void colors;
  const t = useTranslations("publicProfile.contactCard");
  const card = useMemo(() => parseConfig(content), [content]);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  const vcard = useMemo(() => (card.name ? buildVcard(card) : ""), [card]);

  useEffect(() => {
    if (!vcard) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(vcard, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
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

  // Pointer + scroll → CSS variables driving the holographic layers. We follow the simeydotme
  // /pokemon-cards-css technique end-to-end (https://github.com/simeydotme/pokemon-cards-css):
  // each pointer move sets six derived custom properties (--pointer-x/y, --pointer-from-center,
  // --pointer-from-left/top, --background-x/y, --card-opacity) which downstream gradient layers
  // read to compute their position, intensity, and parallax. The previous "one stripe + one
  // radial highlight" approach left half the card uncolored ("끊긴" feedback); the simey approach
  // stacks multiple shine layers with `filter: contrast()` so the WHOLE surface is iridescent.
  const pointerOverRef = useRef(false);

  const applyVars = useCallback(
    (x: number, y: number, opacity: number) => {
      const el = cardRef.current;
      if (!el) return;
      const fromCenter = Math.min(
        1,
        Math.sqrt((x - 50) * (x - 50) + (y - 50) * (y - 50)) / 50,
      );
      // background-x/y is mapped to a narrow band (37-63% / 33-67%) so the rainbow scroll is
      // subtle, not wild — same range as simey's adjust(0, 100, 37, 63).
      const bgX = 37 + (x / 100) * 26;
      const bgY = 33 + (y / 100) * 34;
      // Pointer-following tilt: same axis convention ("look toward pointer") as simey, ±8°.
      const rotateY = -((x - 50) / 50) * 8;
      const rotateX = ((y - 50) / 50) * 8;
      el.style.setProperty("--pointer-x", `${x}%`);
      el.style.setProperty("--pointer-y", `${y}%`);
      el.style.setProperty("--pointer-from-center", `${fromCenter}`);
      el.style.setProperty("--pointer-from-left", `${x / 100}`);
      el.style.setProperty("--pointer-from-top", `${y / 100}`);
      el.style.setProperty("--background-x", `${bgX}%`);
      el.style.setProperty("--background-y", `${bgY}%`);
      el.style.setProperty("--card-opacity", `${opacity}`);
      el.style.setProperty("--rotate-x", `${rotateY}deg`);
      el.style.setProperty("--rotate-y", `${rotateX}deg`);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      pointerOverRef.current = true;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      applyVars(x, y, 0.9);
    },
    [applyVars],
  );

  // Pseudo-pointer position based on scroll — simulates the visitor's "look angle" changing as
  // the card moves through the viewport. Tying the holo to scroll instead of a continuous
  // animation matches what the user asked for ("자동으로 움직이는게 아니라 스크롤에 따라").
  const applyScrollVars = useCallback(() => {
    const el = cardRef.current;
    if (!el || pointerOverRef.current) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const cardMid = rect.top + rect.height / 2;
    // 0 (card center at top of viewport) → 100 (at bottom)
    const yPct = Math.max(0, Math.min(100, ((cardMid / vh) * 100)));
    // X stays centered — vertical scroll only drives Y. Light still moves as the card scrolls,
    // and the rainbow visibly slides because background-y feeds the gradient position.
    applyVars(50, yPct, 0.55);
  }, [applyVars]);

  useEffect(() => {
    applyScrollVars();
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        applyScrollVars();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [applyScrollVars]);

  const handlePointerLeave = useCallback(() => {
    pointerOverRef.current = false;
    applyScrollVars();
  }, [applyScrollVars]);

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

  if (!card.name) return null;

  return (
    <li className="profile-fade" style={fadeStyle}>
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={() => {
          setFlipped((v) => !v);
          playCardFlipSound();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((v) => !v);
            playCardFlipSound();
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? t("flipToFront") : t("flipToBack")}
        className="relative cursor-pointer select-none [perspective:1200px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-2xl"
      >
        {/* Two wrappers so flip (slow, 600ms) and tilt (fast, 80ms) can have separate transition
            curves. The outer "flip" wrapper handles the 0/180° rotateY for the flip; the inner
            "tilt" wrapper handles the small rotateX/rotateY from pointer + scroll. Previously
            both rode on the same 600ms transition, which made the scroll-driven tilt lag the
            light position (which has no transition — radial-gradient updates instantly), looking
            "끊긴" / disconnected as the user scrolled. */}
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
          <CardFace>
            <div className="relative z-10 flex items-start justify-between gap-3 px-6 pt-6">
              <div className="min-w-0 flex-1">
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
                <div className="shrink-0 rounded-lg bg-white/95 p-1 shadow-md shadow-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.logoUrl}
                    alt=""
                    className="h-10 w-10 rounded-md object-contain"
                  />
                </div>
              )}
            </div>

            {/* Interactive elements stop click propagation so they fire their own action (open
                mail / dial / navigate / share / download) WITHOUT also flipping the card. The
                rest of the card surface stays clickable to flip. */}
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

            <div className="relative z-10 mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
              {card.phone ? (
                <a
                  href={`tel:${card.phone.replace(/\s/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white transition hover:bg-white/5 active:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  <span>{t("dockCall")}</span>
                </a>
              ) : (
                <span className="flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white/30">
                  <Phone className="h-4 w-4" />
                  <span>{t("dockCall")}</span>
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  shareCard();
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white transition hover:bg-white/5 active:bg-white/10"
              >
                <Share2 className="h-4 w-4" />
                <span>{t("dockShare")}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadVcard();
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white transition hover:bg-white/5 active:bg-white/10"
              >
                <Download className="h-4 w-4" />
                <span>{t("dockSave")}</span>
              </button>
            </div>
          </CardFace>

          {/* BACK — smaller QR with decorated frame so the back face reads as a designed object,
              not a giant block of black-and-white. Brand mark (logo or initial) anchors the top,
              QR centered, name + scan caption below. */}
          <CardFace back>
            <div className="relative z-10 flex h-full flex-col items-center justify-between gap-4 p-6">
              {/* Header band — logo (if any) + tagline */}
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  {card.logoUrl ? (
                    <div className="rounded-md bg-white/95 p-0.5 shadow-md shadow-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.logoUrl}
                        alt=""
                        className="h-6 w-6 rounded object-contain"
                      />
                    </div>
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-[10px] font-bold uppercase text-white/90">
                      {card.name.slice(0, 1)}
                    </span>
                  )}
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">
                    {card.company || t("backTagline")}
                  </p>
                </div>
                <span className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
                  kurl.me
                </span>
              </div>

              {/* QR — framed in a soft white plate with subtle inner ring */}
              {qrDataUrl ? (
                <div className="rounded-2xl bg-white/95 p-3 shadow-2xl shadow-black/50 ring-1 ring-white/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={t("qrAlt")}
                    className="h-32 w-32 sm:h-36 sm:w-36"
                  />
                </div>
              ) : (
                <div className="h-32 w-32 animate-pulse rounded-2xl bg-white/10 sm:h-36 sm:w-36" />
              )}

              {/* Footer — name + instruction */}
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
  children,
}: {
  back?: boolean;
  children: React.ReactNode;
}) {
  // Front sits in-flow and defines the rotating wrapper's height. Back is positioned absolutely
  // on top, rotated 180° so its visible side is the "back". Two separate position classes —
  // putting both `relative` and `absolute` on the same node lets the browser pick whichever the
  // generated stylesheet orders last, which was making the back face render in-flow underneath
  // the front (double-stacked card on initial render).
  const positionClass = back
    ? "absolute inset-0 [transform:rotateY(180deg)]"
    : "relative";
  return (
    <div
      className={
        "contact-card overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-950 text-white shadow-2xl shadow-slate-900/40 [backface-visibility:hidden] " +
        positionClass
      }
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, rgba(67, 56, 202, 0.25) 0%, transparent 50%)," +
          "radial-gradient(120% 80% at 100% 100%, rgba(157, 23, 77, 0.18) 0%, transparent 55%)," +
          "linear-gradient(135deg, #0a0e1c 0%, #131a30 60%, #0a0e1c 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.45)",
      }}
    >
      {/* SHINE layer 1 — dense repeating rainbow scrolling with pointer/scroll position. The
          background-size 400% 400% means the gradient is much larger than the card, so only a
          slice is visible; as background-position moves (linked to --background-x/y mapped to
          37-63% / 33-67%), the visible color palette slides through the full rainbow.
          `filter: contrast(2) saturate(...)` is the metallic key — without it, color-dodge just
          leaves a soft tint, with it the surface reads as foil. Back face flips X so the visual
          direction matches the visitor's pointer side. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(110deg, hsl(283,70%,58%) 0%, hsl(228,70%,55%) 10%, hsl(176,60%,52%) 20%, hsl(93,55%,48%) 30%, hsl(53,75%,55%) 40%, hsl(2,75%,58%) 50%, hsl(283,70%,58%) 60%)",
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
          position. Stacking two gradients at different angles and offsets is what gives the
          surface its 3D-ish shimmer: as the two layers slide independently they cross over each
          other producing the iridescent depth real foil has. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-30deg, hsl(2,75%,58%) 0%, hsl(53,75%,55%) 15%, hsl(93,55%,48%) 30%, hsl(176,60%,52%) 45%, hsl(228,70%,55%) 60%, hsl(283,70%,58%) 75%, hsl(2,75%,58%) 100%)",
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
          layers rather than washing them out. Opacity has a floor (0.2) so the surface always
          has a hint of glare even at rest, and scales up with --card-opacity when active. */}
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

function parseConfig(raw: string): ContactCardConfig {
  try {
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      title: typeof parsed.title === "string" ? parsed.title : null,
      company: typeof parsed.company === "string" ? parsed.company : null,
      email: typeof parsed.email === "string" ? parsed.email : null,
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
      address: typeof parsed.address === "string" ? parsed.address : null,
      website: typeof parsed.website === "string" ? parsed.website : null,
      logoUrl: typeof parsed.logoUrl === "string" ? parsed.logoUrl : null,
    };
  } catch {
    return {
      name: "",
      title: null,
      company: null,
      email: null,
      phone: null,
      address: null,
      website: null,
      logoUrl: null,
    };
  }
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
