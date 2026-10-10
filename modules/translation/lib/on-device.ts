type Availability = "unavailable" | "downloadable" | "downloading" | "available";

export interface OnDeviceTranslator {
  translate(text: string): Promise<string>;
}

interface TranslatorApi {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<OnDeviceTranslator>;
}

interface LanguageDetectorApi {
  availability(): Promise<Availability>;
  create(): Promise<{ detect(text: string): Promise<{ detectedLanguage: string; confidence: number }[]> }>;
}

const MIN_DETECT_LENGTH = 8;
const MIN_DETECT_CONFIDENCE = 0.85;

function browserApi<T>(name: "Translator" | "LanguageDetector"): T | null {
  if (typeof self === "undefined") return null;
  return ((self as unknown as Record<string, unknown>)[name] as T | undefined) ?? null;
}

export function translationSupported(): boolean {
  return browserApi<TranslatorApi>("Translator") !== null;
}

export function primaryLanguage(tag: string): string {
  return tag.trim().toLowerCase().split(/[-_]/)[0];
}

export function readerLanguages(locale: string): Set<string> {
  const browser = typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);
  return new Set([locale, ...browser].filter(Boolean).map(primaryLanguage));
}

const pairs = new Map<string, Promise<boolean>>();

function canTranslate(source: string, target: string): Promise<boolean> {
  const api = browserApi<TranslatorApi>("Translator");
  if (!api) return Promise.resolve(false);
  const key = `${source}>${target}`;
  let pending = pairs.get(key);
  if (!pending) {
    pending = api
      .availability({ sourceLanguage: source, targetLanguage: target })
      .then((availability) => availability !== "unavailable")
      .catch(() => false);
    pairs.set(key, pending);
  }
  return pending;
}

let detector: ReturnType<LanguageDetectorApi["create"]> | null = null;

async function detectLanguage(text: string): Promise<string | null> {
  if (Array.from(text.trim()).length < MIN_DETECT_LENGTH) return null;
  const api = browserApi<LanguageDetectorApi>("LanguageDetector");
  if (!api) return null;
  try {
    detector ??= api.availability().then((availability) => {
      if (availability !== "available") throw new Error(availability);
      return api.create();
    });
    const [top] = await (await detector).detect(text);
    return top && top.confidence >= MIN_DETECT_CONFIDENCE ? primaryLanguage(top.detectedLanguage) : null;
  } catch {
    detector = null;
    return null;
  }
}

export async function translationSource({
  declared,
  text,
  locale,
}: {
  declared?: string | null;
  text: string;
  locale: string;
}): Promise<string | null> {
  if (!translationSupported()) return null;
  const source = declared?.trim() ? primaryLanguage(declared) : await detectLanguage(text);
  if (!source || readerLanguages(locale).has(source)) return null;
  return (await canTranslate(source, primaryLanguage(locale))) ? source : null;
}

const translators = new Map<string, Promise<OnDeviceTranslator>>();

export function openTranslator(
  source: string,
  target: string,
  onDownload?: (loaded: number) => void,
): Promise<OnDeviceTranslator> {
  const api = browserApi<TranslatorApi>("Translator");
  if (!api) return Promise.reject(new Error("Translator unavailable"));
  const key = `${source}>${target}`;
  let pending = translators.get(key);
  if (!pending) {
    pending = api.create({
      sourceLanguage: source,
      targetLanguage: target,
      monitor: (monitor) =>
        monitor.addEventListener("downloadprogress", (event) => onDownload?.((event as ProgressEvent).loaded)),
    });
    translators.set(key, pending);
    pending.catch(() => translators.delete(key));
  }
  return pending;
}

const results = new Map<string, string[]>();

export function rememberedTranslation(key: string): string[] | undefined {
  return results.get(key);
}

export async function translateAll(
  key: string,
  texts: readonly string[],
  translator: OnDeviceTranslator,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const remembered = results.get(key);
  if (remembered && remembered.length === texts.length) return remembered;
  const out: string[] = [];
  for (const text of texts) {
    out.push(await translator.translate(text));
    onProgress?.(out.length, texts.length);
  }
  results.set(key, out);
  return out;
}
