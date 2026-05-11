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

  // Tracks whether the pointer is currently over the card. While true the rAF "idle"
  // animation pauses and the values set by handlePointerMove are authoritative; while false the
  // loop drives a gentle orbit + scroll-based light position so the card feels alive at rest.
  const pointerOverRef = useRef(false);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    pointerOverRef.current = true;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Both axes "look TOWARD pointer" — pointer on left → left edge comes forward, pointer on
    // top → top edge comes forward. Previously the Y axis had its sign flipped so the card
    // tilted the opposite direction vertically vs. horizontally, which felt off.
    const rx = ((x - 50) / 50) * -8; // feeds rotateY
    const ry = ((y - 50) / 50) * 8; // feeds rotateX
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  }, []);

  // Light position responds to page scroll when the pointer isn't engaged — simulates a fixed
  // light source overhead while the card moves through the viewport. Card high in viewport →
  // light at the bottom (we're "looking up at it"); card low → light at the top. No continuous
  // animation: position is static unless the user actually scrolls.
  const applyScrollLight = useCallback(() => {
    const el = cardRef.current;
    if (!el || pointerOverRef.current) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const cardMid = rect.top + rect.height / 2;
    // -0.5 (card center at top of viewport) → +0.5 (at bottom)
    const scrollPct = cardMid / vh - 0.5;
    // Card at bottom of viewport → light at top of card (my small). At top → light at bottom.
    const my = Math.max(10, Math.min(90, 50 - scrollPct * 80));
    el.style.setProperty("--mx", `50%`);
    el.style.setProperty("--my", `${my}%`);
    el.style.setProperty("--rx", `0deg`);
    // Tiny tilt matched to the light shift so the card has a subtle "facing the light" pose.
    el.style.setProperty("--ry", `${((my - 50) / 50) * 4}deg`);
  }, []);

  useEffect(() => {
    applyScrollLight();
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        applyScrollLight();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [applyScrollLight]);

  const handlePointerLeave = useCallback(() => {
    pointerOverRef.current = false;
    // Hand control back to scroll-driven positioning so the highlight doesn't stick where the
    // pointer last was — the card returns to whatever the viewport position says is "natural."
    applyScrollLight();
  }, [applyScrollLight]);

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
            transform: "rotateX(var(--ry, 0deg)) rotateY(var(--rx, 0deg))",
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
          "radial-gradient(120% 80% at 0% 0%, rgba(99, 102, 241, 0.35) 0%, transparent 50%)," +
          "radial-gradient(120% 80% at 100% 100%, rgba(236, 72, 153, 0.25) 0%, transparent 55%)," +
          "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.45)",
      }}
    >
      {/* Pointer-tracked radial highlight. Default gradient size is farthest-corner — we let
          the fade extend ALL THE WAY to 100% (the corner) instead of clamping at 75%, so the
          light truly reaches every edge of the card. With 75% the corners stayed flat-dark and
          the light looked "끊긴" / clipped, especially with low-intensity stops past 50%. The
          back face is `transform: rotateY(180deg)`, which mirrors its content. So when --mx
          says "70% from left," the back face would render the highlight at "30% from left of the
          viewer." We compensate by inverting the X axis on the back face only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage: back
            ? "radial-gradient(circle at calc(100% - var(--mx, 50%)) var(--my, 50%), rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.35) 25%, rgba(255,255,255,0.15) 55%, rgba(255,255,255,0.05) 80%, transparent 100%)"
            : "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.35) 25%, rgba(255,255,255,0.15) 55%, rgba(255,255,255,0.05) 80%, transparent 100%)",
          mixBlendMode: "color-dodge",
        }}
      />
      {/* Sharp diagonal foil stripe — codingapple's foil example pushed harder: tighter color
          stops (40%→60%), saturated yellow/purple/cyan triplet, 1.5× pointer-parallax. Back face
          flips the parallax direction so the stripe drift matches the visitor's pointer side. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(105deg, transparent 38%, rgba(255,219,112,0.85) 45%, rgba(132,50,255,0.7) 50%, rgba(119,198,255,0.75) 55%, transparent 62%)",
          backgroundSize: "220% 220%",
          backgroundPosition: back
            ? "calc(50% - (var(--mx, 50%) - 50%) * 1.5) calc(50% + (var(--my, 50%) - 50%) * 1.5)"
            : "calc(50% + (var(--mx, 50%) - 50%) * 1.5) calc(50% + (var(--my, 50%) - 50%) * 1.5)",
          mixBlendMode: "color-dodge",
        }}
      />
      {/* Cross-hatch etched foil pattern — two repeating gradients at ±45° make the visible
          grain of real Pokemon-TCG holographic cards. Overlay blend keeps it subtle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px), " +
            "repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 4px)",
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
