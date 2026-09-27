import type { Metadata } from "next";
import { authorBaseUrl, type HeaderReader } from "./subdomain-origin";

/** Public author tabs must override the root shortener's canonical and social card. */
export function authorSectionMetadata(
  headers: HeaderReader,
  username: string,
  section: "about" | "collections",
  description?: string | null,
): Metadata {
  const title = `${section === "about" ? "About" : "Collections"} · @${username}`;
  const url = `${authorBaseUrl(headers, username)}/${section}`;
  return {
    title,
    description: description ?? null,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description ?? undefined,
      url,
      type: "profile",
      siteName: `@${username}`,
      // These tabs have no dedicated image; do not inherit the shortener's generated card.
      images: [],
    },
    twitter: { card: "summary", title, description: description ?? undefined, images: [] },
  };
}
