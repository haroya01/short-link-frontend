import { afterEach, describe, expect, it, vi } from "vitest";
import { applyNotFoundLocale } from "@/lib/not-found-locale";

const LOCALES = ["en", "ko", "ja", "vi", "hi"];
const TITLES = { en: "Page not found · kurl", ko: "KO · kurl", ja: "JA · kurl", vi: "VI · kurl", hi: "HI · kurl" };

function visit(path: string, opts: { cookie?: string; languages?: string[] } = {}) {
  window.history.replaceState(null, "", path);
  document.cookie = "NEXT_LOCALE=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  if (opts.cookie) document.cookie = `NEXT_LOCALE=${opts.cookie}; path=/`;
  vi.spyOn(navigator, "languages", "get").mockReturnValue(opts.languages ?? ["de-DE"]);
  applyNotFoundLocale(LOCALES, "ko", TITLES);
  return {
    lang: document.documentElement.lang,
    flag: document.documentElement.getAttribute("data-nf-locale"),
    title: document.title,
  };
}

describe("applyNotFoundLocale", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-nf-locale");
  });

  it("follows the locale in the address on a first visit", () => {
    expect(visit("/ja/no-such-page")).toEqual({ lang: "ja", flag: "ja", title: "JA · kurl" });
    expect(visit("/vi/no-such-page").flag).toBe("vi");
    expect(visit("/hi/no-such-page").flag).toBe("hi");
  });

  it("lets the address win over the saved locale", () => {
    expect(visit("/ko/no-such-page", { cookie: "ja" }).flag).toBe("ko");
  });

  it("uses the saved locale when the address names none", () => {
    expect(visit("/no-such-page", { cookie: "vi" }).flag).toBe("vi");
    expect(visit("/no-such-page", { cookie: "zz", languages: ["hi-IN"] }).flag).toBe("hi");
  });

  it("falls back to the browser's languages, then to the default", () => {
    expect(visit("/no-such-page", { languages: ["fr-FR", "ja-JP"] }).flag).toBe("ja");
    expect(visit("/no-such-page", { languages: ["fr-FR"] })).toEqual({
      lang: "ko",
      flag: "ko",
      title: "KO · kurl",
    });
  });

  it("stays valid as a standalone script", () => {
    // app/not-found.tsx inlines the function source — it must run with nothing but its arguments.
    window.history.replaceState(null, "", "/en/no-such-page");
    const source = `(${applyNotFoundLocale.toString()})(${JSON.stringify(LOCALES)},"ko",${JSON.stringify(TITLES)})`;
    new Function(source)();
    expect(document.documentElement.getAttribute("data-nf-locale")).toBe("en");
    expect(document.title).toBe("Page not found · kurl");
  });
});
