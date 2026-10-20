export type InviteTarget = { kind: "code"; code: string } | { kind: "url"; url: string };

const JOIN_PATH = /\/rooms\/join\/([^/?#]+)/;
const CODE = /^[A-Za-z0-9_-]{3,64}$/;

const KURL_HOST = /(^|\.)kurl\.me$/;

export function inviteTarget(raw: string, currentHost = ""): InviteTarget | null {
  const text = raw.trim();
  if (!text) return null;
  const joined = JOIN_PATH.exec(text);
  if (joined) return { kind: "code", code: decodeURIComponent(joined[1]) };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : /^[^\s/]+\.[a-z]{2,}\//i.test(text) ? `https://${text}` : null;
  if (withScheme) {
    try {
      const url = new URL(withScheme);
      const web = url.protocol === "https:" || url.protocol === "http:";
      const ours = KURL_HOST.test(url.hostname) || (currentHost !== "" && url.host === currentHost);
      return web && ours ? { kind: "url", url: url.href } : null;
    } catch {
      return null;
    }
  }
  return CODE.test(text) ? { kind: "code", code: text } : null;
}
