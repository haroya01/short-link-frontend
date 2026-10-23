const EVENT = "kurl:home-refresh";
const AWAY_MS = 60_000;
const LONG_AWAY_MS = 30 * 60_000;

export function requestHomeRefresh(): void {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onHomeRefresh(
  refresh: () => void,
  reload: () => void = refresh,
  back: () => void = refresh,
): () => void {
  let hiddenAt: number | null = null;
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    if (away >= LONG_AWAY_MS) reload();
    else if (away >= AWAY_MS) back();
    hiddenAt = null;
  };
  window.addEventListener(EVENT, refresh);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener(EVENT, refresh);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
