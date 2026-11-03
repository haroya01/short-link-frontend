import { useCallback, useEffect, useState } from "react";

export function useSectionLoad<T>(enabled: boolean, load: () => Promise<T>, key: unknown = null) {
  const [state, setState] = useState<{ data: T | null; failed: boolean }>({ data: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((prev) => (prev.failed ? { data: prev.data, failed: false } : prev));
    load()
      .then((data) => {
        if (!cancelled) setState({ data, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, load, key, attempt]);
  return { ...state, retry: useCallback(() => setAttempt((n) => n + 1), []) };
}
