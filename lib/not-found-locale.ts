/**
 * Picks the language of the static 404 document and flags it on `<html>` (lang, data-nf-locale) and
 * in the tab title. Order: the locale in the address, then the NEXT_LOCALE cookie, then the
 * browser's languages, then `fallback`.
 *
 * Self-contained on purpose. app/not-found.tsx inlines this function's own source as its pre-paint
 * script (`toString()`), so the body may use only its arguments and browser globals — no imports,
 * no module-level values.
 */
export function applyNotFoundLocale(
  locales: readonly string[],
  fallback: string,
  titles: Record<string, string>,
): void {
  try {
    let pick = "";
    const segment = location.pathname.split("/")[1];
    if (locales.indexOf(segment) >= 0) pick = segment;
    if (!pick) {
      const cookie = document.cookie.match(/(?:^|; )NEXT_LOCALE=([A-Za-z-]+)/);
      if (cookie && locales.indexOf(cookie[1]) >= 0) pick = cookie[1];
    }
    if (!pick) {
      const preferred = navigator.languages || [navigator.language];
      for (let i = 0; i < preferred.length && !pick; i++) {
        const code = String(preferred[i]).slice(0, 2).toLowerCase();
        if (locales.indexOf(code) >= 0) pick = code;
      }
    }
    if (!pick) pick = fallback;
    document.documentElement.lang = pick;
    document.documentElement.setAttribute("data-nf-locale", pick);
    if (titles[pick]) document.title = titles[pick];
  } catch {
    /* the fallback copy stays on screen */
  }
}
