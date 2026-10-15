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

const BLOG_HOST = process.env.NEXT_PUBLIC_BLOG_HOST;
const NOTE_HOSTS = [BLOG_HOST, SHORT_HOST, ...(BLOG_HOST ? [] : ["localhost", "127.0.0.1"])]
  .filter((h): h is string => !!h)
  .map((h) => h.toLowerCase());

/** A kurl note id from a note page URL (blog.kurl.me/@user/notes/12, a remote note's page, or the
 *  same-origin dev routes) — null for anything else. Mirrors the backend's PostNoteQuotes. */
export function kurlNoteId(url: string): number | null {
  try {
    const u = new URL(url.trim());
    if (!NOTE_HOSTS.includes(u.hostname.replace(/^www\./, "").toLowerCase())) return null;
    const m = u.pathname.match(/\/notes\/(\d{1,15})\/?$/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
