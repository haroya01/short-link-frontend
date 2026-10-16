export const RENDER_HEADER = "X-Kurl-Render";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export function renderContextHeaders(url: string): Record<string, string> {
  if (typeof window !== "undefined" || !API_BASE || !url.startsWith(API_BASE)) return {};
  return { [RENDER_HEADER]: "server" };
}

export function withRenderContext(input: string | URL | Request, init: RequestInit): RequestInit {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const extra = renderContextHeaders(url);
  const names = Object.keys(extra);
  if (names.length === 0) return init;
  const headers = new Headers(init.headers);
  for (const name of names) headers.set(name, extra[name]);
  return { ...init, headers };
}
