const SHORT_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://kurl.me";

export function shortUrlOf(code: string): string {
  return `${SHORT_BASE}/${code}`;
}
