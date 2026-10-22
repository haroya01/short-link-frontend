export function sameOriginPath(raw: string | null): string | null {
  if (!raw || typeof window === "undefined") return null;
  let url: URL;
  try {
    url = new URL(raw, window.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin || url.pathname.startsWith("//")) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
