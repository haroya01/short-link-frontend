export type SubdomainRoute =
  | { kind: "pass" }
  | { kind: "proxy" }
  | { kind: "redirect"; location: string }
  | { kind: "notFound" };

const KURL_DOMAIN_SUFFIX = ".kurl.me";

const PROXIED_SUBDOMAINS = new Set(["blog"]);

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "origin",
  "admin",
  "help",
  "status",
  "mail",
  "kurl",
  "official",
]);

// Usernames are [a-z0-9][a-z0-9_]{2,15}; only the underscore-free ones were ever valid hostnames.
const LEGACY_CARD_NAME = /^[a-z0-9]{3,16}$/;

export function routeSubdomain(host: string, pathname: string, search: string): SubdomainRoute {
  if (!host.endsWith(KURL_DOMAIN_SUFFIX)) return { kind: "pass" };
  const subdomain = host.slice(0, -KURL_DOMAIN_SUFFIX.length);
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return { kind: "pass" };
  if (PROXIED_SUBDOMAINS.has(subdomain)) return { kind: "proxy" };
  if (pathname === "/" && LEGACY_CARD_NAME.test(subdomain)) {
    return { kind: "redirect", location: `https://kurl.me/u/${subdomain}${search}` };
  }
  return { kind: "notFound" };
}
