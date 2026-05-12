"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  Building2,
  Camera,
  Clock,
  Coffee,
  Copy,
  Croissant,
  Image as GalleryIcon,
  MapPin,
  Navigation,
  PartyPopper,
  Phone,
  Share2,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlaceCategory } from "@/types";
import { parsePlaceConfig } from "@/lib/block-config-parsers";
import { directionsUrl, staticMapUrl } from "@/lib/google-maps-static";
import type { ThemeColors } from "../_lib/theme";
import { CardFloatingChip } from "./CardFloatingChip";

type Props = {
  content: string;
  colors: ThemeColors;
  fadeStyle?: CSSProperties;
};

const CATEGORY_ICONS: Record<PlaceCategory, typeof Coffee> = {
  cafe: Coffee,
  bakery: Croissant,
  restaurant: UtensilsCrossed,
  retail: ShoppingBag,
  studio: Camera,
  gallery: GalleryIcon,
  popup: PartyPopper,
  space: Building2,
};

/**
 * PLACE block — single business / venue card. Visual hierarchy follows the deep market-research
 * pass (see PR #...): cover photo (or Static Map fallback) on top at 5:3, then name + address +
 * hours, then a primary "길찾기" CTA with three ghost actions below (call / copy address / share).
 * Korean F&B / retail / studio sellers think of their storefront photo as their identity, so when
 * a cover photo is uploaded we feature it; only if none is set do we fall back to a Static Maps
 * PNG of the location.
 *
 * <p>Google Maps interactions are link-outs, not embeds: the iframe Embed API has no dark-mode
 * scheme and creates touch-scroll conflicts on mobile. A Static Map {@code <img>} is faster,
 * themable, doesn't fight the page scroll, and "길찾기" deep-links into the visitor's preferred
 * map app (Apple Maps on iOS / Google Maps app on Android) via the {@code maps/dir/?api=1} URL.
 */
export function PlaceEntry({ content, colors, fadeStyle }: Props) {
  const t = useTranslations("publicProfile.place");
  const config = useMemo(() => parsePlaceConfig(content), [content]);
  const [copied, setCopied] = useState(false);

  if (!config) return null;

  const CategoryIcon = config.category ? CATEGORY_ICONS[config.category] : null;
  const heroSrc = config.coverUrl ?? staticMapUrl({ lat: config.lat, lng: config.lng });
  const directions = directionsUrl({
    lat: config.lat,
    lng: config.lng,
    placeId: config.placeId,
    name: config.name,
  });

  async function copyAddress() {
    if (!navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(config!.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: config!.name,
          text: `${config!.name} · ${config!.address}`,
          url: directions,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    void copyAddress();
  }

  return (
    <li className="profile-fade" style={fadeStyle}>
      <article
        className={`profile-card-static overflow-hidden ${colors.card} ${colors.cardBorder}`}
      >
        {/* COVER = primary action. The directions anchor stretches over the whole 5:3 photo/map
            via {@code absolute inset-0}, so a single tap anywhere on the most visually prominent
            element does what the visitor is most likely to want ("이 가게 어떻게 가지?"). The
            "길찾기 →" pill at the bottom-right is the affordance — without it the tap target reads
            as a passive image. The share button is a sibling (not nested inside the anchor —
            nested-interactive is a WCAG violation), positioned ABOVE the anchor via z-index so
            tapping it doesn't also trigger directions. */}
        <div className="relative aspect-[5/3] w-full bg-slate-100">
          {heroSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroSrc}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
          <a
            href={directions}
            target="_blank"
            rel="noreferrer"
            aria-label={t("directions")}
            className="absolute inset-0 focus-ring"
          >
            <span className="sr-only">{t("directions")}</span>
          </a>
          {CategoryIcon && (
            <CardFloatingChip position="top-left" icon={<CategoryIcon className="h-3 w-3" />}>
              {t(`category_${config.category}` as const)}
            </CardFloatingChip>
          )}
          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <Navigation className="h-3 w-3" />
            {t("directions")}
          </span>
          <button
            type="button"
            onClick={share}
            aria-label={t("share")}
            className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 px-4 py-3">
          <h3 className={`text-[15px] font-semibold leading-tight ${colors.primary}`}>
            {config.name}
          </h3>
          <div className={`flex items-start gap-1.5 text-[12px] leading-snug ${colors.muted}`}>
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{config.address}</span>
            <button
              type="button"
              onClick={copyAddress}
              aria-label={copied ? t("copied") : t("copy")}
              className="focus-ring shrink-0 rounded p-0.5 text-slate-400 transition hover:text-slate-700"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          {config.phone && (
            <p className={`flex items-start gap-1.5 text-[12px] leading-snug ${colors.muted}`}>
              <Phone className="mt-0.5 h-3 w-3 shrink-0" />
              <a
                href={`tel:${config.phone}`}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {config.phone}
              </a>
            </p>
          )}
          {config.hoursText && (
            <p className={`flex items-start gap-1.5 text-[12px] leading-snug ${colors.muted}`}>
              <Clock className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="whitespace-pre-line">{config.hoursText}</span>
            </p>
          )}
        </div>
      </article>
    </li>
  );
}

