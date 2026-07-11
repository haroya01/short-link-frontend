"use client";

import { useEffect, useState } from "react";

/**
 * Whether the browser currently has a network connection, tracked via the online/offline events.
 * Starts optimistic (true) so SSR and the first client paint agree — the real value is synced from
 * navigator.onLine on mount. A false here means fetches will fail; surfaces (like the offline
 * banner) use it to say so quietly instead of letting a request error read as an empty/broken state.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}
