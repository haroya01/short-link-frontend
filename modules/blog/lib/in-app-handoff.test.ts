import { describe, expect, it } from "vitest";
import { externalBrowserUrl, inAppBrowser, withParam } from "./in-app-handoff";

const UA = {
  kakaoIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5",
  kakaoAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36;KAKAOTALK 2610850",
  lineIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.9.0",
  lineAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240505.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 Line/14.8.1/IAB",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  instagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0",
};

const POST = "https://blog.kurl.me/@hana/letters-to-followers";

describe("telling the in-app browser apart, the same way the link redirect does", () => {
  it.each([
    ["KakaoTalk on iOS", UA.kakaoIos, "kakaotalk"],
    ["KakaoTalk on Android", UA.kakaoAndroid, "kakaotalk"],
    ["LINE on iOS", UA.lineIos, "line"],
    ["LINE on Android", UA.lineAndroid, "line"],
    ["Safari", UA.safariIos, null],
    ["Chrome", UA.chrome, null],
    ["an empty agent", "", null],
  ])("%s", (_, ua, app) => {
    expect(inAppBrowser(ua)).toBe(app);
  });

  it("needs LINE's version slash, so a word that merely contains line isn't LINE", () => {
    expect(inAppBrowser("Mozilla/5.0 Outline Chrome/129")).toBeNull();
  });
});

describe("the default-browser address", () => {
  it("hands KakaoTalk the whole page address, encoded, link key included", () => {
    const url = `${POST}?k=Ab_9-x&utm=a b#c`;
    const out = externalBrowserUrl(UA.kakaoIos, url)!;
    expect(out.startsWith("kakaotalk://web/openExternal?url=")).toBe(true);
    expect(decodeURIComponent(out.slice("kakaotalk://web/openExternal?url=".length))).toBe(url);
    expect(out).not.toContain("#");
  });

  it("asks LINE to leave by adding its parameter, before any fragment and after any query", () => {
    expect(externalBrowserUrl(UA.lineIos, POST)).toBe(`${POST}?openExternalBrowser=1`);
    expect(externalBrowserUrl(UA.lineAndroid, `${POST}?k=key1`)).toBe(`${POST}?k=key1&openExternalBrowser=1`);
    expect(externalBrowserUrl(UA.lineIos, `${POST}?k=key1#comment-3`)).toBe(`${POST}?k=key1&openExternalBrowser=1#comment-3`);
  });

  it("joins without a doubled separator", () => {
    expect(withParam(`${POST}?`, "x=1")).toBe(`${POST}?x=1`);
    expect(withParam(`${POST}?a=1&`, "x=1")).toBe(`${POST}?a=1&x=1`);
  });

  it("offers nothing in a regular browser or another app's browser", () => {
    expect(externalBrowserUrl(UA.safariIos, POST)).toBeNull();
    expect(externalBrowserUrl(UA.chrome, POST)).toBeNull();
    expect(externalBrowserUrl(UA.instagram, POST)).toBeNull();
  });
});
