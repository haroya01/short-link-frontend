/** Host of a URL, lowercased, www-stripped — mirrors the backend normalizer. Null when unparsable. */
export function hostOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

/** Same parent-domain walk the backend uses: a host is covered by itself or any parent entry. */
export function isDomainCovered(host: string, blocked: string[]): boolean {
  return blocked.some((d) => host === d || host.endsWith(`.${d}`));
}
