"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { readStorageString, writeStorageString } from "@/lib/storage-json";

/**
 * Reader preference: paint social highlights over the article body, or read it clean. A per-device
 * choice (no account) — set once, it holds across every post. Default ON (the marks are part of how a
 * kurl post reads); turning them off only stops the painting, never highlight *creation* (a reader can
 * still select text and highlight while the layer is hidden). Mirrors the localStorage + broadcast
 * grammar of {@link useTagPrefs}: one window event keeps the toggle button and the painter in step.
 */
const KEY = "kurl:blog:show-highlights";
const EVENT = "kurl:showhighlights";

// useLayoutEffect on the client (seed before paint → no flash of marks the reader hid), useEffect on
// the server (no warning). The first client render must still match SSR, so state starts at the
// default and the stored value applies in the pre-paint layout effect.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readShow(): boolean {
  // Absent = default ON; only an explicit "0" hides. So a first-time reader always sees highlights.
  return readStorageString(KEY) !== "0";
}

export function useShowHighlights() {
  // Default ON on the first render (matches SSR); the layout effect below reconciles with storage
  // before paint so a reader who hid them never sees a flash of marks.
  const [show, setShow] = useState(true);

  useIsoLayoutEffect(() => {
    setShow(readShow());
  }, []);

  useEffect(() => {
    const sync = () => setShow(readShow());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Read the current value from storage rather than a captured `show`, so the flip is correct even if
  // this toggle handler was created before a broadcast from another mounted instance updated storage.
  // Side effects (persist + broadcast) run once, outside any setState updater — an updater must be pure
  // (React can call it twice, e.g. Strict Mode), and the broadcast + storage write are not. The state
  // then lands via the broadcast's own sync listener (and the direct setShow below for this instance).
  const toggle = useCallback(() => {
    const next = !readShow();
    writeStorageString(KEY, next ? "1" : "0");
    setShow(next);
    window.dispatchEvent(new CustomEvent(EVENT));
  }, []);

  return { show, toggle };
}
