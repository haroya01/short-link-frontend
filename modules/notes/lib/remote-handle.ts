const REMOTE_HANDLE = /^@?[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:[0-9]{1,5})?$/;

/** @user@server, as Mastodon search reads an account on another server. */
export function looksLikeRemoteHandle(text: string): boolean {
  return REMOTE_HANDLE.test(text.trim());
}

export function remoteQueryDomain(text: string): string | null {
  const query = text.trim();
  if (looksLikeRemoteHandle(query)) return query.slice(query.lastIndexOf("@") + 1).toLowerCase();
  if (!/^https:\/\/\S+$/i.test(query)) return null;
  try {
    const { hostname } = new URL(query);
    return hostname.includes(".") ? hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}
