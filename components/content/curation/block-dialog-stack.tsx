"use client";

import type { useTranslations } from "next-intl";
import { BookingBlockDialog } from "@/components/content/curation/booking-block-dialog";
import { ContactCardBlockDialog } from "@/components/content/curation/contact-card-block-dialog";
import { EmailFormBlockDialog } from "@/components/content/curation/email-form-block-dialog";
import { EmbedBlockDialog } from "@/components/content/curation/embed-block-dialog";
import { EventBlockDialog } from "@/components/content/curation/event-block-dialog";
import { GalleryBlockDialog } from "@/components/content/curation/gallery-block-dialog";
import { ImageBlockDialog } from "@/components/content/curation/image-block-dialog";
import { PlaceBlockDialog } from "@/components/content/curation/place-block-dialog";
import { ProductCardBlockDialog } from "@/components/content/curation/product-card-block-dialog";
import { TextBlockDialog } from "@/components/content/curation/text-block-dialog";
import type { BlockDialogState } from "@/components/content/curation/use-block-dialog";

export type BlockDialogs = {
  contactCard: BlockDialogState<string>;
  gallery: BlockDialogState<string>;
  productCard: BlockDialogState<string>;
  emailForm: BlockDialogState<string>;
  booking: BlockDialogState<string>;
  event: BlockDialogState<string>;
  place: BlockDialogState<string>;
  image: BlockDialogState<string>;
  embed: BlockDialogState<string>;
  text: BlockDialogState<string>;
};

type JsonBlockType =
  | "CONTACT_CARD"
  | "GALLERY"
  | "PRODUCT_CARD"
  | "EMAIL_FORM"
  | "BOOKING"
  | "EVENT"
  | "PLACE";

type Props = {
  dialogs: BlockDialogs;
  persistJsonBlock: (
    type: JsonBlockType,
    blockId: number | null,
    configJson: string,
  ) => Promise<void> | void;
  persistImageBlock: (blockId: number | null, url: string) => Promise<void> | void;
  persistEmbedBlock: (blockId: number | null, url: string) => Promise<void> | void;
  persistTextBlock: (blockId: number | null, content: string) => Promise<void> | void;
  t: ReturnType<typeof useTranslations<"settings.profile">>;
};

/**
 * Renders every block-editor dialog at once and routes their submit callbacks back through the
 * orchestrator's persist functions. Each dialog stays mounted with {@code open=false} so opening
 * one doesn't pay the cost of re-creating its form state on every show.
 */
export function BlockDialogStack({
  dialogs,
  persistJsonBlock,
  persistImageBlock,
  persistEmbedBlock,
  persistTextBlock,
  t,
}: Props) {
  return (
    <>
      <ContactCardBlockDialog
        open={dialogs.contactCard.open}
        initialJson={dialogs.contactCard.initialPayload}
        onOpenChange={(open) => !open && dialogs.contactCard.close()}
        onSubmit={(json) =>
          persistJsonBlock("CONTACT_CARD", dialogs.contactCard.blockId, json)
        }
        t={t}
      />
      <GalleryBlockDialog
        open={dialogs.gallery.open}
        initialJson={dialogs.gallery.initialPayload}
        onOpenChange={(open) => !open && dialogs.gallery.close()}
        onSubmit={(json) => persistJsonBlock("GALLERY", dialogs.gallery.blockId, json)}
        t={t}
      />
      <ProductCardBlockDialog
        open={dialogs.productCard.open}
        initialJson={dialogs.productCard.initialPayload}
        onOpenChange={(open) => !open && dialogs.productCard.close()}
        onSubmit={(json) =>
          persistJsonBlock("PRODUCT_CARD", dialogs.productCard.blockId, json)
        }
        t={t}
      />
      <EmailFormBlockDialog
        open={dialogs.emailForm.open}
        initialJson={dialogs.emailForm.initialPayload}
        onOpenChange={(open) => !open && dialogs.emailForm.close()}
        onSubmit={(json) =>
          persistJsonBlock("EMAIL_FORM", dialogs.emailForm.blockId, json)
        }
        t={t}
      />
      <BookingBlockDialog
        open={dialogs.booking.open}
        initialJson={dialogs.booking.initialPayload}
        onOpenChange={(open) => !open && dialogs.booking.close()}
        onSubmit={(json) => persistJsonBlock("BOOKING", dialogs.booking.blockId, json)}
        t={t}
      />
      <EventBlockDialog
        open={dialogs.event.open}
        initialJson={dialogs.event.initialPayload}
        onOpenChange={(open) => !open && dialogs.event.close()}
        onSubmit={(json) => persistJsonBlock("EVENT", dialogs.event.blockId, json)}
        t={t}
      />
      <PlaceBlockDialog
        open={dialogs.place.open}
        initialJson={dialogs.place.initialPayload}
        onOpenChange={(open) => !open && dialogs.place.close()}
        onSubmit={(json) => persistJsonBlock("PLACE", dialogs.place.blockId, json)}
        t={t}
      />
      <ImageBlockDialog
        open={dialogs.image.open}
        initialUrl={dialogs.image.initialPayload}
        onOpenChange={(open) => !open && dialogs.image.close()}
        onSubmit={(url) => persistImageBlock(dialogs.image.blockId, url)}
        t={t}
      />
      <EmbedBlockDialog
        open={dialogs.embed.open}
        initialUrl={dialogs.embed.initialPayload}
        onOpenChange={(open) => !open && dialogs.embed.close()}
        onSubmit={(url) => persistEmbedBlock(dialogs.embed.blockId, url)}
        t={t}
      />
      <TextBlockDialog
        open={dialogs.text.open}
        initialContent={dialogs.text.initialPayload}
        onOpenChange={(open) => !open && dialogs.text.close()}
        onSubmit={(content) => persistTextBlock(dialogs.text.blockId, content)}
        t={t}
      />
    </>
  );
}
