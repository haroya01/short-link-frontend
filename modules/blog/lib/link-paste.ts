import { planEmbed } from "@/modules/blog/lib/post-embed";

export type PasteSpot = {
  /** Text is selected (a range, not a caret). */
  selection: boolean;
  /** The caret sits on a line with nothing else on it — an empty paragraph, or an empty line after a soft break. */
  emptyLine: boolean;
  /** Inside a code block or inline code, where a URL stays literal text. */
  code: boolean;
};

export type PastePlan =
  | { kind: "link-selection"; href: string }
  | { kind: "link-with-choice"; href: string; video: boolean }
  | { kind: "link-inline"; href: string }
  | { kind: "default" };

const SINGLE_URL = /^https?:\/\/[^\s<>"]+$/i;

export function pastedUrl(text: string | null | undefined): string | null {
  const trimmed = (text ?? "").trim();
  if (!SINGLE_URL.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

export function isVideoUrl(url: string): boolean {
  return planEmbed(url)?.kind === "video";
}

export function planPaste(text: string | null | undefined, spot: PasteSpot): PastePlan {
  const href = pastedUrl(text);
  if (!href || spot.code) return { kind: "default" };
  if (spot.selection) return { kind: "link-selection", href };
  if (spot.emptyLine) return { kind: "link-with-choice", href, video: isVideoUrl(href) };
  return { kind: "link-inline", href };
}
