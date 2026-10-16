const REMOTE_HANDLE = /^@?[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:[0-9]{1,5})?$/;
const HANDLE_IN_PROGRESS = /^@?([A-Za-z0-9_][A-Za-z0-9_.-]{0,63})@([A-Za-z0-9.-]*)$/;
const COMPLETE_HOST = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::[0-9]{1,5})?$/;

export function normalizeRemoteQuery(text: string): string {
  return text
    .trim()
    .replace(/\uFF20/g, "@")
    .replace(/^acct:/i, "")
    .trim();
}

/** @user@server, as Mastodon search reads an account on another server. */
export function looksLikeRemoteHandle(text: string): boolean {
  return REMOTE_HANDLE.test(normalizeRemoteQuery(text));
}

export function remoteQueryDomain(text: string): string | null {
  const query = normalizeRemoteQuery(text);
  if (looksLikeRemoteHandle(query)) return query.slice(query.lastIndexOf("@") + 1).toLowerCase();
  if (!/^https:\/\/\S+$/i.test(query)) return null;
  try {
    const { hostname } = new URL(query);
    return hostname.includes(".") ? hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function looksLikeCompleteDomain(domain: string): boolean {
  return COMPLETE_HOST.test(domain);
}

export function liveRemoteQueryDomain(text: string): string | null {
  const domain = remoteQueryDomain(text);
  return domain && looksLikeCompleteDomain(domain) ? domain : null;
}

export function handleBeingTyped(text: string): { user: string; domain: string } | null {
  const match = HANDLE_IN_PROGRESS.exec(normalizeRemoteQuery(text));
  return match ? { user: match[1], domain: match[2].toLowerCase() } : null;
}
