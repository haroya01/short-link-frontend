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
import type { ThemeColors } from "../_lib/theme";

type Props = {
  content: string;
  /**
   * Theme colors accepted for API parity with sibling entry cards; intentionally ignored. The
   * contact card sets its own dark holographic surface so it reads as a physical object, not as
   * "another feed row" — that's the design intent of the 명함 vertical.
   */
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Holographic digital business card — the centerpiece of the 명함 vertical.
 *
 * <p>Three concerns layered intentionally:
 * <ul>
 *   <li><b>Material:</b> radial gradient tracks pointer position, blended via {@code color-dodge}
 *       over a metallic base + diagonal rainbow stripe + faint grain. Card also tilts 8° on
 *       perspective transform — pointer pivots feel physical without dropping into 60fps churn
 *       (transitions debounce via `transition-transform 240ms`).</li>
 *   <li><b>Action dock:</b> three big bottom buttons (Call / Share / Save). Web Share Sheet on
 *       phones surfaces KakaoTalk, iMessage, etc. without any SDK integration.</li>
 *   <li><b>vCard QR:</b> visitors with a second phone scan the embedded QR and add the contact
 *       directly via the OS camera intent. Encodes the full vCard payload (~200 chars typical,
 *       inside QR `M` ECC headroom).</li>
 * </ul>
 */
export function ContactCardEntry({ content, colors, fadeStyle }: Props) {
  // colors accepted for parity with siblings; not used because the card sets its own surface.
  void colors;
  const t = useTranslations("publicProfile.contactCard");
  const card = useMemo(() => parseConfig(content), [content]);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const vcard = useMemo(() => (card.name ? buildVcard(card) : ""), [card]);

  // Generate the QR once we have a vCard payload. QR `M` ECC at ~v6 fits ~250 chars; typical
  // cards are ~200 — plenty of headroom. Fail-silent on the unlikely error so the rest of the
  // card stays usable.
  useEffect(() => {
    if (!vcard) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(vcard, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 200,
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

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Tilt pivots from center — pointer at corner ≈ 8° lean.
    const rx = ((x - 50) / 50) * 8;
    const ry = ((y - 50) / 50) * -8;
    el.style.setProperty("--mx", `${x}%`);
    el.style.setProperty("--my", `${y}%`);
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
  }, []);

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--mx", `50%`);
    el.style.setProperty("--my", `50%`);
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }, []);

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
    // Web Share opens the OS share sheet — picker for KakaoTalk / iMessage / SMS / etc. on
    // phones. Desktop browsers usually no-op, so fall back to copying the profile URL.
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
        className="contact-card group relative overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-950 text-white shadow-2xl shadow-slate-900/40"
        style={
          {
            transform:
              "perspective(1000px) rotateX(var(--ry, 0deg)) rotateY(var(--rx, 0deg))",
            transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
            backgroundImage:
              "radial-gradient(120% 80% at 0% 0%, rgba(99, 102, 241, 0.35) 0%, transparent 50%)," +
              "radial-gradient(120% 80% at 100% 100%, rgba(236, 72, 153, 0.25) 0%, transparent 55%)," +
              "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          } as CSSProperties
        }
      >
        {/* Holo light — radial gradient at pointer position, additive-blended. Falls back to
            a centered rest position when the pointer leaves the card. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 18%, transparent 35%)",
            mixBlendMode: "color-dodge",
          }}
        />
        {/* Diagonal rainbow band — the saturated holographic stripe; offset by pointer for
            a "look at it from a different angle" effect. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(105deg, transparent 30%, rgba(255,119,198,0.7) 42%, rgba(119,198,255,0.7) 50%, rgba(255,200,119,0.7) 58%, transparent 70%)",
            backgroundSize: "200% 200%",
            backgroundPosition:
              "calc(50% + (var(--mx, 50%) - 50%) * 0.6) calc(50% + (var(--my, 50%) - 50%) * 0.6)",
            mixBlendMode: "color-dodge",
          }}
        />
        {/* Faint grain so the surface doesn't read as flat — only really visible up close. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
        />

        <div className="relative z-10 px-6 pt-6">
          <p className="text-2xl font-semibold leading-tight tracking-tight">{card.name}</p>
          {(card.title || card.company) && (
            <p className="mt-1 text-sm text-slate-300">
              {[card.title, card.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <ul className="relative z-10 mt-4 space-y-2 px-6">
          {card.email && (
            <Row icon={<Mail className="h-3.5 w-3.5" />}>
              <a href={`mailto:${card.email}`} className="truncate hover:underline">
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

        {qrDataUrl && (
          <div className="relative z-10 mt-5 flex justify-end px-6">
            <div className="rounded-lg bg-white/95 p-1.5 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={t("qrAlt")}
                width={72}
                height={72}
                className="block h-[72px] w-[72px]"
              />
            </div>
          </div>
        )}

        <div className="relative z-10 mt-5 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
          {card.phone ? (
            <a
              href={`tel:${card.phone.replace(/\s/g, "")}`}
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
            onClick={shareCard}
            className="flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white transition hover:bg-white/5 active:bg-white/10"
          >
            <Share2 className="h-4 w-4" />
            <span>{t("dockShare")}</span>
          </button>
          <button
            type="button"
            onClick={downloadVcard}
            className="flex items-center justify-center gap-1.5 px-3 py-3.5 text-sm font-medium text-white transition hover:bg-white/5 active:bg-white/10"
          >
            <Download className="h-4 w-4" />
            <span>{t("dockSave")}</span>
          </button>
        </div>
      </div>
    </li>
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
