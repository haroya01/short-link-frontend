/** Pure helpers for recognizing kurl short links embedded in posts (shared by the markdown→block
 *  converter, the reader, and the link card). No React / client deps so server code can import it. */

export const SHORT_HOST = process.env.NEXT_PUBLIC_KURL_HOST ?? "kurl.me";

/** A kurl short code from a URL (https://kurl.me/abc123) — null if the URL isn't a kurl short link. */
export function kurlShortCode(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.host.replace(/^www\./, "").toLowerCase() !== SHORT_HOST.toLowerCase()) return null;
    const m = u.pathname.match(/^\/([0-9A-Za-z]{3,16})\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
