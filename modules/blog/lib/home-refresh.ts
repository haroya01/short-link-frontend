const EVENT = "kurl:home-refresh";
const AWAY_MS = 60_000;

export function requestHomeRefresh(): void {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onHomeRefresh(refresh: () => void): () => void {
  let hiddenAt: number | null = null;
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    if (hiddenAt !== null && Date.now() - hiddenAt >= AWAY_MS) refresh();
    hiddenAt = null;
  };
  window.addEventListener(EVENT, refresh);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener(EVENT, refresh);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
