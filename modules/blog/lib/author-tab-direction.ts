/**
 * The author tab switch (글 0 · 시리즈 1 · 소개 2) is unified with the feed's 최신/인기/팔로잉 motion: a
 * direction-aware horizontal slide of the content + a gliding underline.
 *
 * The author surface uses the subdomain model ({user}.kurl.me/series), so its tabs are hard
 * navigations — and the page already rides the cross-document View Transition (@view-transition in
 * globals.css). The directional content slide is therefore driven by the VT pseudo-elements, with the
 * direction picked in a `pagereveal` listener registered early (author layout inline script); that
 * script also parks the *previous* tab index on `window` so the underline can glide from it. This
 * module is just the typed reader the tab bar uses for that hand-off.
 */
declare global {
  interface Window {
    /** Previous author tab index for this load — set by the author layout's pagereveal script. */
    __kurlAuthorNavPrev?: number | null;
  }
}

/** The tab we came from on this load (null on a cold first visit or unsupported browser). */
export function readNavPrev(): number | null {
  if (typeof window === "undefined") return null;
  return window.__kurlAuthorNavPrev ?? null;
}

export {};
