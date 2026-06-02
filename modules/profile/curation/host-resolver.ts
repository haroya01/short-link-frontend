/**
 * Builds a "match a URL's host against a provider whitelist" resolver — the identical body the booking
 * and embed provider modules each carried (parse the URL, require http(s), compare the lowercased host
 * against each provider's host list, return the first match or null). They differ only in their data
 * (the provider list + its id union), so the data stays in each module and the matching lives here.
 *
 * Returns null for empty input, an unparseable URL, or a non-http(s) protocol — so a caller can treat
 * null uniformly as "not a recognised provider URL".
 *
 * @template S a provider spec carrying at least a `hosts` list (the resolver returns the whole spec)
 */
export function createHostResolver<S extends { hosts: readonly string[] }>(
  providers: readonly S[],
): (url: string) => S | null {
  return (url) => {
    if (!url) return null;
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    const host = parsed.host.toLowerCase();
    for (const p of providers) {
      if (p.hosts.includes(host)) return p;
    }
    return null;
  };
}
