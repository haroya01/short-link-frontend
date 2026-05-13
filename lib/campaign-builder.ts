/**
 * Pure helpers for the leads campaign builder. The builder takes the owner's message body,
 * finds every http(s) link, attaches `utm_source=email` + `utm_campaign=<slug>` so click
 * analytics on the link dashboard can split this campaign from others, and replaces each link
 * with its kurl-shortened form. Sending stays out-of-platform (Gmail/Mailchimp/etc.) — the
 * builder only produces a copy-ready body.
 */

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,!?;:]/g;

/**
 * Lowercase + dash-separated, trimmed of leading/trailing dashes, capped at 40 chars so the
 * campaign param stays human-readable in the dashboard. Non-ASCII characters are kept as-is —
 * a Korean campaign name should be queryable as "신상품-출시" rather than mangled to "-----".
 */
export function slugifyCampaign(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s/_]+/g, "-")
    .replace(/[?#&=]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Find http(s) URLs in plain text. Trailing punctuation is excluded so "see https://x.com." stays clean. */
export function extractUrls(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(URL_PATTERN)) {
    const url = m[0];
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export type UtmTriple = {
  source: string;
  campaign: string;
  /** Optional medium — defaults to "email" but the caller can override. */
  medium?: string;
};

/**
 * Add (or overwrite) utm_source / utm_campaign / utm_medium params on a URL. Existing params are
 * preserved so callers that pre-tagged a link (e.g. with `utm_content=button1`) don't lose them.
 * Returns the original string if the URL doesn't parse — we'd rather not shorten than ship a
 * mangled link.
 */
export function appendUtmParams(url: string, utm: UtmTriple): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  parsed.searchParams.set("utm_source", utm.source);
  parsed.searchParams.set("utm_campaign", utm.campaign);
  parsed.searchParams.set("utm_medium", utm.medium ?? "email");
  return parsed.toString();
}

/**
 * Replace each URL in `body` with the result of `replacer(url)`, preserving everything else
 * (whitespace, punctuation, markdown). Used after each URL has been shortened so the output
 * body is paste-ready.
 */
export function replaceUrls(body: string, replacer: (url: string) => string): string {
  return body.replace(URL_PATTERN, (match) => replacer(match));
}
