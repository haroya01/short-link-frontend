import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fresh = async () => {
  vi.resetModules();
  return import("./on-device");
};

type Availability = "unavailable" | "downloadable" | "downloading" | "available";

function install({
  pairs = "downloadable",
  detected,
  detector = "available",
}: {
  pairs?: Availability;
  detected?: { detectedLanguage: string; confidence: number };
  detector?: Availability;
}) {
  const translate = vi.fn(async (text: string) => `[ko] ${text}`);
  const create = vi.fn(async ({ monitor }: { monitor?: (m: EventTarget) => void }) => {
    const target = new EventTarget();
    monitor?.(target);
    target.dispatchEvent(Object.assign(new Event("downloadprogress"), { loaded: 0.5 }));
    return { translate };
  });
  vi.stubGlobal("Translator", { availability: vi.fn(async () => pairs), create });
  vi.stubGlobal("LanguageDetector", {
    availability: vi.fn(async () => detector),
    create: vi.fn(async () => ({ detect: vi.fn(async () => (detected ? [detected] : [])) })),
  });
  return { translate, create };
}

beforeEach(() => {
  vi.stubGlobal("navigator", { languages: ["ko-KR"], language: "ko-KR" });
});
afterEach(() => vi.unstubAllGlobals());

describe("when a translation is offered", () => {
  it("offers nothing where the browser has no translator", async () => {
    const { translationSource } = await fresh();
    await expect(translationSource({ declared: "ja", text: "境界を引く", locale: "ko" })).resolves.toBeNull();
  });

  it("takes the declared language first and offers it when it isn't the reader's", async () => {
    const { translationSource } = await fresh();
    install({ detected: { detectedLanguage: "ko", confidence: 0.99 } });
    await expect(translationSource({ declared: "ja-JP", text: "境界を引く", locale: "ko" })).resolves.toBe("ja");
  });

  it("offers nothing for the reader's own languages, the page's or the browser's", async () => {
    const { translationSource } = await fresh();
    install({});
    await expect(translationSource({ declared: "ko", text: "산책 코스", locale: "ko" })).resolves.toBeNull();
    vi.stubGlobal("navigator", { languages: ["ko-KR", "en-US"], language: "ko-KR" });
    await expect(translationSource({ declared: "en", text: "Hello there", locale: "ko" })).resolves.toBeNull();
  });

  it("offers nothing for a pair the browser can't translate", async () => {
    const { translationSource } = await fresh();
    install({ pairs: "unavailable" });
    await expect(translationSource({ declared: "ja", text: "境界を引く", locale: "ko" })).resolves.toBeNull();
  });

  it("detects an undeclared language only from enough text and with confidence", async () => {
    let { translationSource } = await fresh();
    install({ detected: { detectedLanguage: "en", confidence: 0.9 } });
    await expect(translationSource({ text: "Hello", locale: "ko" })).resolves.toBeNull();
    await expect(translationSource({ text: "Hello from the fediverse", locale: "ko" })).resolves.toBe("en");
    ({ translationSource } = await fresh());
    install({ detected: { detectedLanguage: "en", confidence: 0.6 } });
    await expect(translationSource({ text: "Hello from the fediverse", locale: "ko" })).resolves.toBeNull();
  });

  it("doesn't download a detector just to decide, so an undeclared text stays untranslated", async () => {
    const { translationSource } = await fresh();
    install({ detector: "downloadable", detected: { detectedLanguage: "en", confidence: 0.99 } });
    await expect(translationSource({ text: "Hello from the fediverse", locale: "ko" })).resolves.toBeNull();
  });
});

describe("translating", () => {
  it("reports the model download and remembers the result for the same item", async () => {
    const { openTranslator, rememberedTranslation, translateAll } = await fresh();
    const { translate, create } = install({});
    const downloads: number[] = [];
    const translator = await openTranslator("en", "ko", (loaded) => downloads.push(loaded));
    expect(downloads).toEqual([0.5]);
    const progress: number[] = [];
    await expect(translateAll("note:12>ko", ["Hello", "world"], translator, (done) => progress.push(done))).resolves.toEqual([
      "[ko] Hello",
      "[ko] world",
    ]);
    expect(progress).toEqual([1, 2]);
    expect(rememberedTranslation("note:12>ko")).toEqual(["[ko] Hello", "[ko] world"]);
    await translateAll("note:12>ko", ["Hello", "world"], await openTranslator("en", "ko"));
    expect(translate).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
