const WINDOW_MS = 60_000;
const LIMIT = 6;
const hits = new Map<string, number[]>();

export function allowRevalidate(username: string, now = Date.now()): boolean {
  const recent = (hits.get(username) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(username, recent);
    return false;
  }
  recent.push(now);
  hits.set(username, recent);
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
  return true;
}
