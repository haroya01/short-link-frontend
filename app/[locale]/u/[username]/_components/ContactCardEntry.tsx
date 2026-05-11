"use client";

import { Building2, Download, Mail, MapPin, Phone } from "lucide-react";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { ContactCardConfig } from "@/types";
import type { ThemeColors } from "../_lib/theme";

type Props = {
  /** Raw JSON from the backend block — parsed defensively. */
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

/**
 * Digital business card rendering. Name + headline at top, contact rows below, save-to-contacts
 * (.vcf) button as the call-to-action. vCard is generated client-side so the visitor's browser
 * triggers a native "save contact" dialog without a server round-trip — works on iOS/Android.
 */
export function ContactCardEntry({ content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.contactCard");
  const card = parseConfig(content);
  if (!card.name) return null;

  function downloadVcard() {
    const blob = new Blob([buildVcard(card)], { type: "text/vcard;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(card.name)}.vcf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <li className="profile-fade" style={fadeStyle}>
      <div className={`overflow-hidden rounded-xl border ${colors.card} ${colors.cardBorder}`}>
        <div className="px-5 pt-5">
          <p className={`text-lg font-semibold leading-tight ${colors.primary}`}>{card.name}</p>
          {(card.title || card.company) && (
            <p className={`mt-1 text-sm ${colors.muted}`}>
              {[card.title, card.company].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <ul className="mt-3 space-y-1.5 px-5 pb-2">
          {card.email && (
            <Row icon={<Mail className="h-3.5 w-3.5" />} colors={colors}>
              <a href={`mailto:${card.email}`} className="hover:underline">
                {card.email}
              </a>
            </Row>
          )}
          {card.phone && (
            <Row icon={<Phone className="h-3.5 w-3.5" />} colors={colors}>
              <a href={`tel:${card.phone.replace(/\s/g, "")}`} className="hover:underline">
                {card.phone}
              </a>
            </Row>
          )}
          {card.website && (
            <Row icon={<Building2 className="h-3.5 w-3.5" />} colors={colors}>
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
            <Row icon={<MapPin className="h-3.5 w-3.5" />} colors={colors}>
              <span>{card.address}</span>
            </Row>
          )}
        </ul>
        <button
          type="button"
          onClick={downloadVcard}
          className={`flex w-full items-center justify-center gap-2 border-t px-4 py-3 text-sm font-medium transition ${colors.cardBorder} ${colors.primary} ${colors.cardHover}`}
        >
          <Download className="h-3.5 w-3.5" />
          {t("save")}
        </button>
      </div>
    </li>
  );
}

function Row({
  icon,
  colors,
  children,
}: {
  icon: React.ReactNode;
  colors: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <li className={`flex items-center gap-2 text-[12px] ${colors.muted}`}>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </li>
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

/** Minimal vCard 3.0 — fields omitted entirely when null so the saved contact stays clean. */
function buildVcard(card: ContactCardConfig): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcard(card.name)}`];
  if (card.company || card.title) {
    if (card.company) lines.push(`ORG:${escapeVcard(card.company)}`);
    if (card.title) lines.push(`TITLE:${escapeVcard(card.title)}`);
  }
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

