/**
 * Editor-side row representation of a profile feed entry. Mirrors the public API's
 * {@code PublicProfileEntry} but only carries what the editor needs to identify + reorder.
 *
 * <ul>
 *   <li><b>LINK</b> — references an existing user link by shortCode; details (URL, OG title)
 *       come from the full link list and are joined at render time.</li>
 *   <li><b>BLOCK</b> — text/divider/image inserted between links. {@code id} is the backend's
 *       profile_block primary key; {@code content} is the editable payload.</li>
 * </ul>
 */
export type FeedItem =
  | { kind: "LINK"; code: string }
  | {
      kind: "BLOCK";
      id: number;
      type:
        | "TEXT"
        | "DIVIDER"
        | "IMAGE"
        | "EMBED"
        | "EMAIL_FORM"
        | "CONTACT_CARD"
        | "GALLERY"
        | "PRODUCT_CARD"
        | "BOOKING";
      content: string | null;
    };
