import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarDays,
  Contact,
  GalleryHorizontal,
  Mail,
  MapPin,
  Play,
  ShoppingBag,
} from "lucide-react";
import type { useTranslations } from "next-intl";
import {
  bookingSummary,
  countGalleryImages,
  eventSummary,
  placeSummary,
  productCardSummary,
  summarizeJsonField,
} from "@/modules/profile/lib/feed-summarizers";

type T = ReturnType<typeof useTranslations<"settings.profile">>;

/**
 * The eight block types that share the same "drag handle + icon + summary text + edit/delete
 * actions" row shape in the feed editor. DIVIDER (hr-only slim row), IMAGE (thumbnail variant),
 * TEXT (section-header row), and LINK (separate label + remove flow) all have their own bespoke
 * renderers and stay outside this registry.
 */
export type CommonBlockType =
  | "CONTACT_CARD"
  | "GALLERY"
  | "PRODUCT_CARD"
  | "EMAIL_FORM"
  | "BOOKING"
  | "EVENT"
  | "PLACE"
  | "EMBED";

export type BlockRowMeta = {
  Icon: LucideIcon;
  /** Build the row label from the block's content. Empty return falls back to the placeholder. */
  render: (content: string | null, t: T) => string;
  /** i18n key for the empty-content placeholder. */
  placeholderKey: Parameters<T>[0];
  /**
   * Two visual treatments: "primary" reads as a configured block with a meaningful summary, "muted"
   * is the lighter mono / lower-contrast treatment used when the row text is a raw URL (EMBED).
   */
  textStyle: "primary" | "muted";
};

export const BLOCK_ROW_META: Record<CommonBlockType, BlockRowMeta> = {
  CONTACT_CARD: {
    Icon: Contact,
    render: (c) => summarizeJsonField(c, "name"),
    placeholderKey: "addContactCardPlaceholder",
    textStyle: "primary",
  },
  GALLERY: {
    Icon: GalleryHorizontal,
    render: (c, t) => {
      const count = countGalleryImages(c);
      return count > 0 ? t("galleryRowSummary", { count }) : "";
    },
    placeholderKey: "addGalleryPlaceholder",
    textStyle: "primary",
  },
  PRODUCT_CARD: {
    Icon: ShoppingBag,
    render: (c) => productCardSummary(c),
    placeholderKey: "addProductCardPlaceholder",
    textStyle: "primary",
  },
  EMAIL_FORM: {
    Icon: Mail,
    render: (c) => summarizeJsonField(c, "title"),
    placeholderKey: "addEmailFormPlaceholder",
    textStyle: "primary",
  },
  BOOKING: {
    Icon: CalendarDays,
    render: (c) => bookingSummary(c),
    placeholderKey: "addBookingPlaceholder",
    textStyle: "primary",
  },
  EVENT: {
    Icon: CalendarClock,
    render: (c) => eventSummary(c),
    placeholderKey: "addEventPlaceholder",
    textStyle: "primary",
  },
  PLACE: {
    Icon: MapPin,
    render: (c) => placeSummary(c),
    placeholderKey: "addPlacePlaceholder",
    textStyle: "primary",
  },
  EMBED: {
    Icon: Play,
    render: (c) => c ?? "",
    placeholderKey: "addEmbedPlaceholder",
    textStyle: "muted",
  },
};

export function isCommonBlockType(type: string): type is CommonBlockType {
  return type in BLOCK_ROW_META;
}
