"use client";

import { useMemo, type CSSProperties } from "react";
import { Download, Mail, MapPin, Phone, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ContactCardConfig } from "@/types";
import { parseContactCardConfig } from "@/lib/block-config-parsers";
import { useCardTilt } from "@/lib/use-card-tilt";
import type { ThemeColors } from "../_lib/theme";
import { getPalette } from "./contact-card-palettes";

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
 *   <li><b>Pointer-tracked tilt + shine:</b> {@code useCardTilt} writes CSS variables for
 *       rotateX/Y and the foil light position; the card tilts with the pointer and the
 *       light catch slides with it.</li>
 *   <li><b>Sharper foil stripe:</b> tight color stops (yellow → purple → cyan, 38%→62%) make the
 *       diagonal highlight feel like a real foil light catch, vs. the softer multi-stop rainbow
 *       it was before. Stripe position scales with pointer at ~1.5× for an exaggerated parallax.</li>
 *   <li><b>Cross-hatch foil texture:</b> two stacked {@code repeating-linear-gradient}s at ±45°
 *       paint the etched diagonal grid you see on holographic cards in person. Overlay
 *       blend-mode + low opacity keeps it as texture, not pattern.</li>
 *   <li><b>Inner bevel ring:</b> {@code box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08)} adds
 *       a faint inner edge highlight — the card looks like it has thickness.</li>
 * </ul>
 */
export function ContactCardEntry({ content, colors, fadeStyle }: Props) {
  void colors;
  const t = useTranslations("publicProfile.contactCard");
  const card = useMemo(() => parseContactCardConfig(content), [content]);
  const palette = useMemo(() => getPalette(card.palette), [card.palette]);
  const { cardRef, onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave } =
    useCardTilt();

  const vcard = useMemo(() => (card.name ? buildVcard(card) : ""), [card]);

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
        className="relative select-none rounded-2xl [perspective:1200px]"
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
        <div
          className="relative [transform-style:preserve-3d]"
          style={{
            transform:
              "rotateX(var(--rotate-y, 0deg)) rotateY(var(--rotate-x, 0deg))",
            transition: "transform 80ms ease-out",
          }}
        >
          <CardFace>
            {/* Share button — small ghost icon top-right. Moved here from the old 3-button dock at
                the bottom. Visually present but secondary, freeing the bottom of the card for the
                single primary action (vCard save). */}
            <button
              type="button"
              onClick={shareCard}
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

            <ul className="relative z-10 mt-4 space-y-2 px-6">
              {card.email && (
                <Row icon={<Mail className="h-3.5 w-3.5" />}>
                  <a
                    href={`mailto:${card.email}`}
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

            {/* Single primary action — vCard save. Call and Share were dropped from the dock and
                moved closer to the info they relate to: phone is its own tappable `tel:` row above
                (no separate Call button needed), share is a small icon in the top-right corner of
                the card. This matches the cross-card "1 primary button" rule that Place/Link/Event
                cards already follow — Contact card was the outlier with 3 equal-weight buttons. */}
            <div className="relative z-10 mt-5 border-t border-white/10">
              <button
                type="button"
                onClick={downloadVcard}
                className="focus-ring flex w-full items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white transition hover:bg-white/5 active:bg-white/10"
              >
                <Download className="h-4 w-4" />
                <span>{t("dockSave")}</span>
              </button>
            </div>
          </CardFace>
        </div>
      </div>
    </li>
  );
}

/**
 * Front face of the card. Stacked layers (back-to-front):
 * 1. Base dark gradient — the substrate.
 * 2. Pointer-tracking radial gradient (color-dodge) — the moving "light catch".
 * 3. Sharp diagonal foil stripe (color-dodge) — the holographic highlight, parallaxes with pointer.
 * 4. Cross-hatch etched grid (overlay) — texture so the foil reads as material, not gradient.
 * 5. Grain noise (overlay) — subpixel jitter so the surface doesn't look perfectly clean.
 * 6. Inner bevel ring (box-shadow inset) — fake card-edge depth.
 * 7. Content layer — text / dock (whatever the caller passes as children).
 */
function CardFace({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="contact-card relative overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-950 text-white shadow-2xl shadow-slate-900/40"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 0% 0%, var(--foil-ambient-1, rgba(67, 56, 202, 0.25)) 0%, transparent 50%)," +
          "radial-gradient(120% 80% at 100% 100%, var(--foil-ambient-2, rgba(157, 23, 77, 0.18)) 0%, transparent 55%)," +
          "linear-gradient(135deg, var(--foil-substrate, #0a0e1c) 0%, var(--foil-substrate, #131a30) 60%, var(--foil-substrate, #0a0e1c) 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.45)",
      }}
    >
      {/* SHINE layer 1 — dense repeating rainbow scrolling with pointer/scroll position. The
          background-size 400% 400% means the gradient is much larger than the card, so only a
          slice is visible; as background-position moves (linked to --background-x/y mapped to
          37-63% / 33-67%), the visible color palette slides through the full rainbow.
          `filter: contrast(2) saturate(...)` is the metallic key — without it, color-dodge just
          leaves a soft tint, with it the surface reads as foil. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(110deg, var(--foil-c1) 0%, var(--foil-c2) 10%, var(--foil-c3) 20%, var(--foil-c4) 30%, var(--foil-c5) 40%, var(--foil-c6) 50%, var(--foil-c1) 60%)",
          backgroundSize: "400% 400%",
          backgroundPosition: "var(--background-x, 50%) var(--background-y, 50%)",
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
            "repeating-linear-gradient(-30deg, var(--foil-c6) 0%, var(--foil-c5) 15%, var(--foil-c4) 30%, var(--foil-c3) 45%, var(--foil-c2) 60%, var(--foil-c1) 75%, var(--foil-c6) 100%)",
          backgroundSize: "400% 400%",
          backgroundPosition: "var(--pointer-x, 50%) var(--pointer-y, 50%)",
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
          backgroundImage:
            "radial-gradient(farthest-corner circle at var(--pointer-x, 50%) var(--pointer-y, 50%), hsla(0,0%,100%,0.6) 8%, hsla(0,0%,100%,0.25) 22%, hsla(0,0%,0%,0.4) 90%)",
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
