import { describe, expect, it } from "vitest";
import { KNOWN_TEMPLATE_LABELS, extractHandle, fillTemplate, templatesFor } from "./link-templates";

const ids = (locale: string) => templatesFor(locale).map((t) => t.id);
const template = (locale: string, id: string) => templatesFor(locale).find((t) => t.id === id)!;

describe("templatesFor", () => {
  it("keeps the Korean list as it was", () => {
    expect(ids("ko")).toEqual(["instagram", "x", "youtube", "tiktok", "github", "kakao", "naver-blog", "velog", "email"]);
  });

  it("gives Japanese editors the services they post on", () => {
    expect(ids("ja")).toEqual([
      "instagram", "x", "youtube", "tiktok", "note", "hatena-blog", "ameblo", "pixiv", "booth", "github", "email",
    ]);
  });

  it("gives every other locale only the global services", () => {
    for (const locale of ["en", "vi", "hi"]) {
      expect(ids(locale)).toEqual(["instagram", "x", "youtube", "tiktok", "github", "email"]);
    }
  });
});

describe("Japanese templates", () => {
  it.each([
    ["note", "https://note.com/haroya", "https://note.com/haroya/n/n1a2b3c", "haroya"],
    ["hatena-blog", "https://haroya.hatenablog.com", "https://haroya.hatenablog.com/entry/2026/11/02/120000", "haroya"],
    ["ameblo", "https://ameblo.jp/haroya", "https://ameblo.jp/haroya/entry-12345678901.html", "haroya"],
    ["pixiv", "https://www.pixiv.net/users/12345678", "https://www.pixiv.net/en/users/12345678/artworks", "12345678"],
    ["booth", "https://haroya.booth.pm", "https://haroya.booth.pm/items/1234567", "haroya"],
  ])("%s fills its URL and reads the handle back", (id, filled, existing, handle) => {
    const tpl = template("ja", id);
    expect(fillTemplate(tpl, handle)).toBe(filled);
    expect(tpl.handleRegex.exec(filled)?.[1]).toBe(handle);
    expect(extractHandle(existing)).toBe(handle);
  });

  it("reads a Hatena handle from every Hatena blog domain", () => {
    expect(extractHandle("https://haroya.hatenablog.jp/")).toBe("haroya");
    expect(extractHandle("https://haroya.hateblo.jp/entry/1")).toBe("haroya");
    expect(extractHandle("https://haroya.hatenablog.com?ref=x")).toBe("haroya");
  });

  it("does not mistake the service's own site for a handle", () => {
    expect(extractHandle("https://www.hatenablog.com/")).toBeNull();
    expect(extractHandle("https://hatenablog.com/")).toBeNull();
    expect(extractHandle("https://booth.pm/ja/items/1234567")).toBeNull();
    expect(extractHandle("https://www.booth.pm/")).toBeNull();
    expect(extractHandle("https://haroya.booth.pm.example.com")).toBeNull();
  });

  it("puts the handle where the field selection expects it, for subdomain templates too", () => {
    for (const tpl of templatesFor("ja")) {
      const start = tpl.urlTemplate.indexOf("{h}");
      expect(fillTemplate(tpl, "abc").slice(start, start + 3)).toBe("abc");
    }
  });
});

describe("switching chips", () => {
  it("carries a handle from a platform this locale does not list", () => {
    expect(extractHandle("https://blog.naver.com/haroya")).toBe("haroya");
    expect(fillTemplate(template("ja", "note"), extractHandle("https://blog.naver.com/haroya")!)).toBe(
      "https://note.com/haroya",
    );
    expect(fillTemplate(template("ko", "github"), extractHandle("https://haroya.hatenablog.com")!)).toBe(
      "https://github.com/haroya",
    );
  });

  it("treats every template's label as untouched, whichever locale offered it", () => {
    for (const label of ["Instagram", "note", "BOOTH", "Velog", "Email"]) expect(KNOWN_TEMPLATE_LABELS.has(label)).toBe(true);
    for (const locale of ["ko", "ja", "en"]) {
      for (const tpl of templatesFor(locale)) expect(KNOWN_TEMPLATE_LABELS.has(tpl.label)).toBe(true);
    }
  });

  it("still reads the existing shapes", () => {
    expect(extractHandle("https://instagram.com/haroya")).toBe("haroya");
    expect(extractHandle("https://twitter.com/haroya")).toBe("haroya");
    expect(extractHandle("https://pf.kakao.com/_abcDEF")).toBe("abcDEF");
    expect(extractHandle("haroya@example.com")).toBe("haroya@example.com");
    expect(extractHandle("https://example.com/haroya")).toBeNull();
  });
});
